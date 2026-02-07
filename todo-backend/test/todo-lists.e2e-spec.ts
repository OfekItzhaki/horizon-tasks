import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';
import { MailerService } from '@nestjs-modules/mailer';

describe('To-Do Lists (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let listId: string;
  const mockEmailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .overrideProvider(MailerService)
      .useValue({ sendMail: jest.fn().mockResolvedValue(true) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Aggressive cleanup before tests
    const userEmails = ['listtest@example.com'];
    for (const email of userEmails) {
      const user = await prisma.user.findFirst({ where: { email } });
      if (user) {
        await (prisma.step as any).deleteMany({
          where: { task: { todoList: { ownerId: user.id } } },
        });
        await (prisma.task as any).deleteMany({
          where: { todoList: { ownerId: user.id } },
        });
        await (prisma.listShare as any).deleteMany({
          where: {
            OR: [{ sharedWithId: user.id }, { toDoList: { ownerId: user.id } }],
          },
        });
        await (prisma.toDoList as any).deleteMany({
          where: { ownerId: user.id },
        });
        await (prisma as any).refreshToken.deleteMany({
          where: { userId: user.id },
        });
        await prisma.user.delete({ where: { id: user.id } });
      }
    }

    // Create test user and login
    const userResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'listtest@example.com',
        password: 'password123',
        name: 'List Test User',
      });

    userId = userResponse.body.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'listtest@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    // Clean up
    if (userId) {
      const userEmails = ['listtest@example.com'];
      const users = await prisma.user.findMany({
        where: { email: { in: userEmails } },
      });
      const userIds = users.map((u) => u.id);

      if (userIds.length > 0) {
        await (prisma.step as any).deleteMany({
          where: { task: { todoList: { ownerId: { in: userIds } } } },
        });
        await (prisma.task as any).deleteMany({
          where: { todoList: { ownerId: { in: userIds } } },
        });
        await (prisma.listShare as any).deleteMany({
          where: {
            OR: [
              { sharedWithId: { in: userIds } },
              { toDoList: { ownerId: { in: userIds } } },
            ],
          },
        });
        await (prisma.toDoList as any).deleteMany({
          where: { ownerId: { in: userIds } },
        });
        await (prisma as any).refreshToken.deleteMany({
          where: { userId: { in: userIds } },
        });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app.close();
  });

  describe('POST /todo-lists', () => {
    it('should create a new list', () => {
      return request(app.getHttpServer())
        .post('/todo-lists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test List',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('name', 'Test List');
          expect(res.body).toHaveProperty('ownerId', userId);
          listId = res.body.id;
        });
    });

    it('should create list with default type CUSTOM', () => {
      return request(app.getHttpServer())
        .post('/todo-lists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Custom List',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.type).toBe('CUSTOM');
        });
    });
  });

  describe('GET /todo-lists', () => {
    it('should return all user lists including defaults', () => {
      return request(app.getHttpServer())
        .get('/todo-lists')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          // Should include default lists (Daily, Weekly, Monthly, Yearly)
          expect(res.body.length).toBeGreaterThanOrEqual(4);
          const defaultListNames = res.body
            .map((list: any) => list.name)
            .filter((name: string) =>
              ['Daily', 'Weekly', 'Monthly', 'Yearly'].includes(name),
            );
          expect(defaultListNames.length).toBe(4);
        });
    });
  });

  describe('GET /todo-lists/:id', () => {
    it('should return list by ID', () => {
      return request(app.getHttpServer())
        .get(`/todo-lists/${listId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(listId);
          expect(res.body.name).toBe('Test List');
        });
    });

    it('should return 404 for non-existent list', () => {
      return request(app.getHttpServer())
        .get('/todo-lists/550e8400-e29b-41d4-a716-446655449999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('PATCH /todo-lists/:id', () => {
    it('should update list', () => {
      return request(app.getHttpServer())
        .patch(`/todo-lists/${listId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated List Name',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated List Name');
        });
    });
  });

  describe('DELETE /todo-lists/:id', () => {
    it('should soft delete list', () => {
      return request(app.getHttpServer())
        .delete(`/todo-lists/${listId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify list is soft deleted (not returned in findAll)
      return request(app.getHttpServer())
        .get('/todo-lists')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          const deletedList = res.body.find((list: any) => list.id === listId);
          expect(deletedList).toBeUndefined();
        });
    });
  });
});
