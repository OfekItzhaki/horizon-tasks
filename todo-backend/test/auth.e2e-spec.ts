import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { EmailService } from '../src/email/email.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;

  const mockEmailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Aggressive cleanup before tests
    const userEmails = ['test@example.com'];
    for (const email of userEmails) {
      const user = await prisma.user.findFirst({ where: { email } });
      if (user) {
        await (prisma.step as any).deleteMany({ where: { task: { todoList: { ownerId: user.id } } } });
        await (prisma.task as any).deleteMany({ where: { todoList: { ownerId: user.id } } });
        await (prisma.listShare as any).deleteMany({ where: { OR: [{ sharedWithId: user.id }, { toDoList: { ownerId: user.id } }] } });
        await (prisma.toDoList as any).deleteMany({ where: { ownerId: user.id } });
        await prisma.user.delete({ where: { id: user.id } });
      }
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      const userEmails = ['test@example.com'];
      const users = await prisma.user.findMany({
        where: { email: { in: userEmails } },
      });
      const userIds = users.map(u => u.id);

      if (userIds.length > 0) {
        await (prisma.step as any).deleteMany({ where: { task: { todoList: { ownerId: { in: userIds } } } } });
        await (prisma.task as any).deleteMany({ where: { todoList: { ownerId: { in: userIds } } } });
        await (prisma.listShare as any).deleteMany({ where: { OR: [{ sharedWithId: { in: userIds } }, { toDoList: { ownerId: { in: userIds } } }] } });
        await (prisma.toDoList as any).deleteMany({ where: { ownerId: { in: userIds } } });
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app.close();
  });

  describe('POST /users (Registration)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('email', 'test@example.com');
          expect(res.body).toHaveProperty('name', 'Test User');
          expect(res.body).not.toHaveProperty('passwordHash');
          userId = res.body.id;
        });
    });

    it('should not allow duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(400);
    });

    it('should validate email format', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);
    });

    it('should validate password length', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          email: 'test2@example.com',
          password: 'short',
        })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
          expect(res.body.user.email).toBe('test@example.com');
          authToken = res.body.accessToken;
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('should reject non-existent user', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(401);
    });
  });

  describe('Protected endpoints', () => {
    it('should access protected endpoint with valid token', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });

    it('should reject request without token', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });
});
