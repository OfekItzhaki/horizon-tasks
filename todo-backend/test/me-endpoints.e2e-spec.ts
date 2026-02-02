import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Me Endpoints (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: number;
  let listId: number;
  let taskId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Create test user and login
    const userResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'metest@example.com',
        password: 'password123',
        name: 'Me Test User',
      });

    userId = userResponse.body.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'metest@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.accessToken;

    // Create a list and task
    const listResponse = await request(app.getHttpServer())
      .post('/todo-lists')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Me Test List' });

    listId = listResponse.body.id;

    const taskResponse = await request(app.getHttpServer())
      .post(`/tasks/todo-list/${listId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ description: 'Me Test Task' });

    taskId = taskResponse.body.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.deleteMany({
        where: { email: { contains: 'metest@example.com' } },
      });
    }
    await app.close();
  });

  describe('GET /me/lists', () => {
    it('should return user lists', () => {
      return request(app.getHttpServer())
        .get('/me/lists')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(5); // 4 defaults + 1 created
          const hasCreatedList = res.body.some(
            (list: any) => list.id === listId,
          );
          expect(hasCreatedList).toBe(true);
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/me/lists').expect(401);
    });
  });

  describe('GET /me/tasks', () => {
    it('should return all user tasks', () => {
      return request(app.getHttpServer())
        .get('/me/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          const hasCreatedTask = res.body.some(
            (task: any) => task.id === taskId,
          );
          expect(hasCreatedTask).toBe(true);
        });
    });

    it('should filter tasks by todoListId', () => {
      return request(app.getHttpServer())
        .get(`/me/tasks?todoListId=${listId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          res.body.forEach((task: any) => {
            expect(task.todoListId).toBe(listId);
          });
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer()).get('/me/tasks').expect(401);
    });
  });
});
