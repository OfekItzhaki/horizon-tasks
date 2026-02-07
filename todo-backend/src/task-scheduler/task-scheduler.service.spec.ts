import { Test, TestingModule } from '@nestjs/testing';
import { TaskSchedulerService } from './task-scheduler.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TaskSchedulerService', () => {
  let service: TaskSchedulerService;

  const mockPrismaService = {
    toDoList: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    step: {
      updateMany: jest.fn(),
    },
    $executeRaw: jest.fn(),
  };

  const mockBullMQ = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskSchedulerService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: 'BullQueue_reminders',
          useValue: mockBullMQ,
        },
      ],
    }).compile();

    service = module.get<TaskSchedulerService>(TaskSchedulerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAndResetDailyTasksIfNeeded', () => {
    it('should reset daily tasks if any are completed before today', async () => {
      const mockTasks = [{ id: 'task-1' }];
      mockPrismaService.task.findMany
        .mockResolvedValueOnce(mockTasks) // check query
        .mockResolvedValueOnce(mockTasks); // reset query

      mockPrismaService.$executeRaw.mockResolvedValue(1);
      mockPrismaService.task.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.step.updateMany.mockResolvedValue({ count: 0 });

      await service.checkAndResetDailyTasksIfNeeded();

      expect(mockPrismaService.task.findMany).toHaveBeenCalled();
      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
    });
  });

  describe('resetDailyTasks', () => {
    it('should reset daily tasks and increment completion count', async () => {
      const mockTasks = [{ id: 'task-1' }];
      mockPrismaService.task.findMany.mockResolvedValue(mockTasks);
      mockPrismaService.$executeRaw.mockResolvedValue(1);
      mockPrismaService.task.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.step.updateMany.mockResolvedValue({ count: 1 });

      await service.resetDailyTasks();

      expect(mockPrismaService.$executeRaw).toHaveBeenCalled();
      expect(mockPrismaService.task.updateMany).toHaveBeenCalled();
    });
  });

  describe('archiveCompletedTasks', () => {
    it('should move completed tasks to finished list', async () => {
      const mockTask = {
        id: 'task-1',
        todoListId: 'list-old',
        todoList: { ownerId: 'user-1' },
      };
      const mockFinishedList = { id: 'list-finished' };

      mockPrismaService.task.findMany.mockResolvedValue([mockTask]);
      mockPrismaService.toDoList.findFirst.mockResolvedValue(mockFinishedList);
      mockPrismaService.task.update.mockResolvedValue(mockTask);

      await service.archiveCompletedTasks();

      expect(mockPrismaService.task.update).toHaveBeenCalledWith({
        where: { id: 'task-1' },
        data: {
          todoListId: 'list-finished',
          originalListId: 'list-old',
        },
      });
    });
  });

  describe('triggerReminders', () => {
    it('should add job to reminders queue', async () => {
      await service.triggerReminders();
      expect(mockBullMQ.add).toHaveBeenCalledWith('processAllReminders', {});
    });
  });
});
