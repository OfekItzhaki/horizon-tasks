import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3000';

const mockUser = {
  id: 1,
  email: 'test@example.com',
  name: 'Test User',
  emailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const handlers = [
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    if (body.email === 'fail@example.com') {
      return HttpResponse.json({ message: 'Invalid credentials', statusCode: 401 }, { status: 401 });
    }
    return HttpResponse.json({
      accessToken: 'mock-jwt-token',
      user: { ...mockUser, email: body.email || mockUser.email },
    });
  }),

  http.get(`${API_BASE}/users`, () => {
    return HttpResponse.json([mockUser]);
  }),

  http.get(`${API_BASE}/todo-lists`, () => {
    return HttpResponse.json([]);
  }),

  http.post(`${API_BASE}/todo-lists`, async ({ request }) => {
    const body = (await request.json()) as { name?: string };
    return HttpResponse.json({
      id: 1,
      name: body.name || 'New List',
      ownerId: mockUser.id,
      order: 0,
      type: 'CUSTOM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      tasks: [],
    });
  }),

  http.post(`${API_BASE}/tasks/todo-list/:todoListId`, async ({ request, params }) => {
    const body = (await request.json()) as { description?: string };
    return HttpResponse.json({
      id: 1,
      description: body.description || 'New task',
      todoListId: Number((params as { todoListId: string }).todoListId),
      completed: false,
      dueDate: null,
      specificDayOfWeek: null,
      reminderDaysBefore: [],
      reminderConfig: null,
      completedAt: null,
      completionCount: 0,
      originalListId: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }),
];
