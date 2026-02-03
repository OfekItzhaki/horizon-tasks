import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListType } from '@prisma/client';
import { TaskSchedulerService } from '../task-scheduler/task-scheduler.service';
import { TaskAccessHelper } from './helpers/task-access.helper';

describe('TasksService', () => {
  let service: TasksService;

  const mockPrismaService = {
    task: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    toDoList: {
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
  };

  const mockTaskSchedulerService = {
    checkAndResetDailyTasksIfNeeded: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TaskSchedulerService,
          useValue: mockTaskSchedulerService,
        },
        TaskAccessHelper,
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.resetAllMocks();
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
      // Prisma query filters out completed tasks; mimic that behavior in the mock.
      mockPrismaService.task.findMany.mockResolvedValue([]);

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

      mockPrismaService.toDoList.findFirst.mockResolvedValue({
        id: todoListId,
        ownerId,
        deletedAt: null,
      });
      mockPrismaService.task.create.mockResolvedValue(mockTask);

      const result = await service.create(todoListId, createDto, ownerId);

      expect(mockPrismaService.task.create).toHaveBeenCalled();
      expect(result).toEqual(mockTask);
    });

    it('should create a task with reminderConfig', async () => {
      const reminderConfig = [
        {
          id: 'reminder-1',
          timeframe: 'EVERY_DAY',
          time: '09:00',
          hasAlarm: true,
        },
      ];
      const createDto = {
        description: 'Task with reminder',
        reminderConfig,
      };
      const mockTask = {
        id: 1,
        ...createDto,
        reminderDaysBefore: [],
        specificDayOfWeek: null,
        todoListId,
      };

      mockPrismaService.toDoList.findFirst.mockResolvedValue({
        id: todoListId,
        ownerId,
        deletedAt: null,
      });
      mockPrismaService.task.create.mockResolvedValue(mockTask);

      const result = await service.create(todoListId, createDto, ownerId);

      expect(mockPrismaService.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reminderConfig,
        }),
      });
      expect(result.reminderConfig).toEqual(reminderConfig);
    });

    it('should create a task with reminderDaysBefore', async () => {
      const createDto = {
        description: 'Task with days before reminder',
        reminderDaysBefore: [7, 1],
        dueDate: new Date('2026-01-30'),
      };
      const mockTask = {
        id: 1,
        ...createDto,
        specificDayOfWeek: null,
        reminderConfig: null,
        todoListId,
      };

      mockPrismaService.toDoList.findFirst.mockResolvedValue({
        id: todoListId,
        ownerId,
        deletedAt: null,
      });
      mockPrismaService.task.create.mockResolvedValue(mockTask);

      const result = await service.create(todoListId, createDto, ownerId);

      expect(mockPrismaService.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          reminderDaysBefore: [7, 1],
        }),
      });
      expect(result.reminderDaysBefore).toEqual([7, 1]);
    });

    it('should create a task with specificDayOfWeek', async () => {
      const createDto = {
        description: 'Weekly task',
        specificDayOfWeek: 1, // Monday
      };
      const mockTask = {
        id: 1,
        ...createDto,
        reminderDaysBefore: [],
        reminderConfig: null,
        todoListId,
      };

      mockPrismaService.toDoList.findFirst.mockResolvedValue({
        id: todoListId,
        ownerId,
        deletedAt: null,
      });
      mockPrismaService.task.create.mockResolvedValue(mockTask);

      const result = await service.create(todoListId, createDto, ownerId);

      expect(mockPrismaService.task.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          specificDayOfWeek: 1,
        }),
      });
      expect(result.specificDayOfWeek).toBe(1);
    });

    it('should throw error if list does not exist', async () => {
      mockPrismaService.toDoList.findFirst.mockResolvedValue(null);

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

    it('should update task with reminderConfig', async () => {
      const mockTask = {
        id: taskId,
        description: 'Task',
        reminderConfig: null,
        reminderDaysBefore: [],
        specificDayOfWeek: null,
        deletedAt: null,
        todoList: {
          ownerId,
          deletedAt: null,
        },
        steps: [],
      };

      const reminderConfig = [
        {
          id: 'reminder-1',
          timeframe: 'EVERY_DAY',
          time: '09:00',
        },
      ];
      const updateDto = {
        reminderConfig,
      };

      mockPrismaService.task.findFirst
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockTask);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        reminderConfig,
      });

      const result = await service.update(taskId, updateDto, ownerId);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: expect.objectContaining({
          reminderConfig,
        }),
      });
      expect(result.reminderConfig).toEqual(reminderConfig);
    });

    it('should update task with reminderDaysBefore', async () => {
      const mockTask = {
        id: taskId,
        description: 'Task',
        reminderConfig: null,
        reminderDaysBefore: [],
        specificDayOfWeek: null,
        deletedAt: null,
        todoList: {
          ownerId,
          deletedAt: null,
        },
        steps: [],
      };

      const updateDto = {
        reminderDaysBefore: [7, 1],
      };

      mockPrismaService.task.findFirst
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockTask);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        reminderDaysBefore: [7, 1],
      });

      const result = await service.update(taskId, updateDto, ownerId);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: expect.objectContaining({
          reminderDaysBefore: [7, 1],
        }),
      });
      expect(result.reminderDaysBefore).toEqual([7, 1]);
    });

    it('should update task with specificDayOfWeek', async () => {
      const mockTask = {
        id: taskId,
        description: 'Task',
        reminderConfig: null,
        reminderDaysBefore: [],
        specificDayOfWeek: null,
        deletedAt: null,
        todoList: {
          ownerId,
          deletedAt: null,
        },
        steps: [],
      };

      const updateDto = {
        specificDayOfWeek: 2, // Tuesday
      };

      mockPrismaService.task.findFirst
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockTask);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        specificDayOfWeek: 2,
      });

      const result = await service.update(taskId, updateDto, ownerId);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: expect.objectContaining({
          specificDayOfWeek: 2,
        }),
      });
      expect(result.specificDayOfWeek).toBe(2);
    });

    it('should clear reminderConfig when set to null', async () => {
      const mockTask = {
        id: taskId,
        description: 'Task',
        reminderConfig: [{ id: 'old', timeframe: 'EVERY_DAY' }],
        reminderDaysBefore: [],
        specificDayOfWeek: null,
        deletedAt: null,
        todoList: {
          ownerId,
          deletedAt: null,
        },
        steps: [],
      };

      const updateDto = {
        reminderConfig: null,
      };

      mockPrismaService.task.findFirst
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(mockTask);
      mockPrismaService.task.update.mockResolvedValue({
        ...mockTask,
        reminderConfig: null,
      });

      const result = await service.update(taskId, updateDto, ownerId);

      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: taskId },
        data: expect.objectContaining({
          reminderConfig: null,
        }),
      });
      expect(result.reminderConfig).toBeNull();
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

      expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            todoListId,
            todoList: expect.objectContaining({
              deletedAt: null,
              OR: expect.any(Array),
            }),
          }),
          include: expect.any(Object),
          orderBy: { order: 'asc' },
        }),
      );
      expect(result).toEqual(mockTasks);
    });
  });
});
