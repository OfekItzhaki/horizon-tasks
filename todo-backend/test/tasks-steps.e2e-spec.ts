import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Tasks and Steps (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: number;
  let listId: number;
  let taskId: number;
  let stepId: number;

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
        email: 'tasktest@example.com',
        password: 'password123',
        name: 'Task Test User',
      });

    userId = userResponse.body.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'tasktest@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.accessToken;

    // Create a list
    const listResponse = await request(app.getHttpServer())
      .post('/todo-lists')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Task Test List' });

    listId = listResponse.body.id;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.user.deleteMany({
        where: { email: { contains: 'tasktest@example.com' } },
      });
    }
    await app.close();
  });

  describe('Tasks CRUD', () => {
    it('should create a task', () => {
      return request(app.getHttpServer())
        .post(`/tasks/todo-list/${listId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test Task',
          completed: false,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.description).toBe('Test Task');
          expect(res.body.todoListId).toBe(listId);
          taskId = res.body.id;
        });
    });

    it('should get all tasks', () => {
      return request(app.getHttpServer())
        .get('/tasks')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should get task by ID', () => {
      return request(app.getHttpServer())
        .get(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(taskId);
          expect(res.body).toHaveProperty('steps');
        });
    });

    it('should update task', () => {
      return request(app.getHttpServer())
        .patch(`/tasks/${taskId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          completed: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.completed).toBe(true);
        });
    });
  });

  describe('Steps CRUD', () => {
    it('should create a step', () => {
      return request(app.getHttpServer())
        .post(`/tasks/${taskId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Test Step',
          completed: false,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.description).toBe('Test Step');
          expect(res.body.taskId).toBe(taskId);
          stepId = res.body.id;
        });
    });

    it('should get all steps for a task', () => {
      return request(app.getHttpServer())
        .get(`/tasks/${taskId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should update step', () => {
      return request(app.getHttpServer())
        .patch(`/steps/${stepId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          completed: true,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.completed).toBe(true);
        });
    });

    it('should reorder steps', async () => {
      // Create another step first
      const step2Response = await request(app.getHttpServer())
        .post(`/tasks/${taskId}/steps`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Step 2',
        });

      const step2Id = step2Response.body.id;

      // Reorder: step2 first, then step1
      return request(app.getHttpServer())
        .patch(`/tasks/${taskId}/steps/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepIds: [step2Id, stepId],
        })
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body[0].id).toBe(step2Id);
          expect(res.body[1].id).toBe(stepId);
        });
    });

    it('should reject reorder with duplicate step IDs', () => {
      return request(app.getHttpServer())
        .patch(`/tasks/${taskId}/steps/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepIds: [stepId, stepId],
        })
        .expect(400);
    });
  });
});
