import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListType } from '../todo-lists/dto/create-todo-list.dto';

describe('TasksService', () => {
  let service: TasksService;
  let prisma: PrismaService;

  const mockPrismaService = {
    task: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    toDoList: {
      findFirstOrThrow: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getTasksByDate', () => {
    const ownerId = 1;

    it('should return daily tasks for any date', async () => {
      const date = new Date('2024-12-25');
      const mockTasks = [
        {
          id: 1,
          description: 'Daily task',
          dueDate: null,
          specificDayOfWeek: null,
          completed: false,
          todoList: { type: ListType.DAILY },
          steps: [],
        },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);

      const result = await service.getTasksByDate(ownerId, date);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should return weekly tasks on specified day of week', async () => {
      const date = new Date('2024-12-25'); // Wednesday (day 3)
      const mockTasks = [
        {
          id: 1,
          description: 'Weekly task',
          dueDate: null,
          specificDayOfWeek: 3, // Wednesday
          completed: false,
          todoList: { type: ListType.WEEKLY },
          steps: [],
        },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);

      const result = await service.getTasksByDate(ownerId, date);

      expect(result).toHaveLength(1);
    });

    it('should return tasks with matching due date', async () => {
      const date = new Date('2024-12-25');
      date.setHours(0, 0, 0, 0);
      const mockTasks = [
        {
          id: 1,
          description: 'Task with due date',
          dueDate: new Date('2024-12-25'),
          specificDayOfWeek: null,
          completed: false,
          todoList: { type: ListType.CUSTOM },
          steps: [],
        },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);

      const result = await service.getTasksByDate(ownerId, date);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should not return completed tasks', async () => {
      const date = new Date('2024-12-25');
      const mockTasks = [
        {
          id: 1,
          description: 'Completed task',
          dueDate: null,
          specificDayOfWeek: null,
          completed: true,
          todoList: { type: ListType.DAILY },
          steps: [],
        },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);

      const result = await service.getTasksByDate(ownerId, date);

      expect(result).toHaveLength(0);
    });
  });

  describe('create', () => {
    const todoListId = 1;
    const ownerId = 1;

    it('should create a task successfully', async () => {
      const createDto = {
        description: 'Test task',
        completed: false,
      };
      const mockTask = {
        id: 1,
        ...createDto,
        todoListId,
      };

      mockPrismaService.toDoList.findFirstOrThrow.mockResolvedValue({
        id: todoListId,
        ownerId,
        deletedAt: null,
      });
      mockPrismaService.task.create.mockResolvedValue(mockTask);

      const result = await service.create(todoListId, createDto, ownerId);

      expect(mockPrismaService.task.create).toHaveBeenCalled();
      expect(result).toEqual(mockTask);
    });

    it('should throw error if list does not exist', async () => {
      mockPrismaService.toDoList.findFirstOrThrow.mockRejectedValue(
        new Error('List not found'),
      );

      await expect(
        service.create(todoListId, { description: 'Test' }, ownerId),
      ).rejects.toThrow();
    });
  });

  describe('findOne', () => {
    const taskId = 1;
    const ownerId = 1;

    it('should return task if found', async () => {
      const mockTask = {
        id: taskId,
        description: 'Test task',
        deletedAt: null,
        todoList: {
          ownerId,
          deletedAt: null,
        },
        steps: [],
      };

      mockPrismaService.task.findFirst.mockResolvedValue(mockTask);

      const result = await service.findOne(taskId, ownerId);

      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException if task not found', async () => {
      mockPrismaService.task.findFirst.mockResolvedValue(null);

      await expect(service.findOne(taskId, ownerId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getTasksWithReminders', () => {
    const ownerId = 1;

    it('should return tasks with reminders for specific date', async () => {
      const date = new Date('2024-12-25');
      const reminderDate = new Date('2024-12-26'); // Due date is 1 day after
      const mockTasks = [
        {
          id: 1,
          description: 'Task with reminder',
          dueDate: reminderDate,
          reminderDaysBefore: 1,
          completed: false,
          todoList: { ownerId, deletedAt: null },
          steps: [],
        },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);

      const result = await service.getTasksWithReminders(ownerId, date);

      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('update', () => {
    const taskId = 1;
    const ownerId = 1;

    it('should update task successfully', async () => {
      const mockTask = {
        id: taskId,
        description: 'Old description',
        completed: false,
        deletedAt: null,
        todoList: {
          ownerId,
          deletedAt: null,
        },
        steps: [],
      };

      const updateDto = {
        description: 'New description',
        completed: true,
      };

      mockPrismaService.task.findFirst
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockTask);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        ...updateDto,
      });

      const result = await service.update(taskId, updateDto, ownerId);

      expect(mockPrismaService.task.update).toHaveBeenCalled();
      expect(result.description).toBe('New description');
      expect(result.completed).toBe(true);
    });
  });

  describe('remove', () => {
    const taskId = 1;
    const ownerId = 1;

    it('should soft delete task', async () => {
      const mockTask = {
        id: taskId,
        description: 'Test task',
        deletedAt: null,
        todoList: {
          ownerId,
          deletedAt: null,
        },
        steps: [],
      };

      mockPrismaService.task.findFirst
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockTask);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        deletedAt: new Date(),
      });

      const result = await service.remove(taskId, ownerId);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result.deletedAt).toBeDefined();
    });
  });

  describe('findAll', () => {
    const ownerId = 1;

    it('should return all tasks for owner', async () => {
      const mockTasks = [
        {
          id: 1,
          description: 'Task 1',
          todoList: { ownerId, deletedAt: null },
          deletedAt: null,
          steps: [],
        },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);

      const result = await service.findAll(ownerId);

      expect(result).toEqual(mockTasks);
    });

    it('should filter by todoListId if provided', async () => {
      const todoListId = 1;
      const mockTasks = [
        {
          id: 1,
          description: 'Task 1',
          todoListId,
          todoList: { ownerId, deletedAt: null },
          deletedAt: null,
          steps: [],
        },
      ];

      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);

      const result = await service.findAll(ownerId, todoListId);

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          todoList: {
            ownerId,
            deletedAt: null,
          },
          todoListId,
        },
        include: expect.any(Object),
        orderBy: { order: 'asc' },
      });
      expect(result).toEqual(mockTasks);
    });
  });
});

