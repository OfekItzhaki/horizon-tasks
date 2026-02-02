import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: number;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Clean up test data
    if (userId) {
      await prisma.user.deleteMany({
        where: { email: { contains: 'test@example.com' } },
      });
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
