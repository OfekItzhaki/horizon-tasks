import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('List Sharing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let ownerToken: string;
  let sharedWithToken: string;
  let ownerId: number;
  let sharedWithId: number;
  let listId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create owner user
    const ownerResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'owner@example.com',
        password: 'password123',
        name: 'Owner User',
      });

    ownerId = ownerResponse.body.id;

    const ownerLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'owner@example.com',
        password: 'password123',
      });

    ownerToken = ownerLoginResponse.body.accessToken;

    // Create user to share with
    const sharedWithResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'sharedwith@example.com',
        password: 'password123',
        name: 'Shared With User',
      });

    sharedWithId = sharedWithResponse.body.id;

    const sharedWithLoginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'sharedwith@example.com',
        password: 'password123',
      });

    sharedWithToken = sharedWithLoginResponse.body.accessToken;

    // Create a list to share
    const listResponse = await request(app.getHttpServer())
      .post('/todo-lists')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Shared List' });

    listId = listResponse.body.id;
  });

  afterAll(async () => {
    if (ownerId && sharedWithId) {
      await prisma.user.deleteMany({
        where: {
          email: { in: ['owner@example.com', 'sharedwith@example.com'] },
        },
      });
    }
    await app.close();
  });

  describe('POST /list-shares/todo-list/:todoListId', () => {
    it('should share list with another user', () => {
      return request(app.getHttpServer())
        .post(`/list-shares/todo-list/${listId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedWithId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.sharedWithId).toBe(sharedWithId);
          expect(res.body.toDoListId).toBe(listId);
        });
    });

    it('should reject sharing with non-existent user', () => {
      return request(app.getHttpServer())
        .post(`/list-shares/todo-list/${listId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedWithId: 99999,
        })
        .expect(404);
    });

    it('should reject sharing list you do not own', () => {
      return request(app.getHttpServer())
        .post(`/list-shares/todo-list/${listId}`)
        .set('Authorization', `Bearer ${sharedWithToken}`)
        .send({
          sharedWithId: ownerId,
        })
        .expect(404);
    });

    it('should reject duplicate share', async () => {
      // First share
      await request(app.getHttpServer())
        .post(`/list-shares/todo-list/${listId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ sharedWithId });

      // Try to share again
      return request(app.getHttpServer())
        .post(`/list-shares/todo-list/${listId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          sharedWithId,
        })
        .expect(409); // Conflict
    });
  });

  describe('GET /list-shares/user/:userId', () => {
    it('should return lists shared with user', () => {
      return request(app.getHttpServer())
        .get(`/list-shares/user/${sharedWithId}`)
        .set('Authorization', `Bearer ${sharedWithToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          const hasSharedList = res.body.some(
            (share: any) => share.toDoList.id === listId,
          );
          expect(hasSharedList).toBe(true);
        });
    });

    it('should reject viewing another user shares', () => {
      return request(app.getHttpServer())
        .get(`/list-shares/user/${sharedWithId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(403);
    });
  });

  describe('GET /list-shares/todo-list/:todoListId', () => {
    it('should return users a list is shared with', () => {
      return request(app.getHttpServer())
        .get(`/list-shares/todo-list/${listId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          const hasSharedWith = res.body.some(
            (share: any) => share.sharedWith.id === sharedWithId,
          );
          expect(hasSharedWith).toBe(true);
        });
    });
  });

  describe('DELETE /list-shares/todo-list/:todoListId/user/:userId', () => {
    it('should unshare list with user', () => {
      return request(app.getHttpServer())
        .delete(`/list-shares/todo-list/${listId}/user/${sharedWithId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      // Verify it's unshared
      return request(app.getHttpServer())
        .get(`/list-shares/todo-list/${listId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200)
        .expect((res) => {
          const hasSharedWith = res.body.some(
            (share: any) => share.sharedWith.id === sharedWithId,
          );
          expect(hasSharedWith).toBe(false);
        });
    });

    it('should reject unsharing list you do not own', () => {
      return request(app.getHttpServer())
        .delete(`/list-shares/todo-list/${listId}/user/${sharedWithId}`)
        .set('Authorization', `Bearer ${sharedWithToken}`)
        .expect(404);
    });
  });
});
