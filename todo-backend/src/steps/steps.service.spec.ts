import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StepsService } from './steps.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StepsService', () => {
  let service: StepsService;

  const mockPrismaService = {
    step: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    task: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StepsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<StepsService>(StepsService);
  });

  afterEach(() => {
    // Reset mock implementations between tests (clearAllMocks leaves mockResolvedValueOnce queues).
    jest.resetAllMocks();
  });

  describe('reorder', () => {
    const taskId = 1;
    const ownerId = 1;
    const mockTask = {
      id: taskId,
      todoList: { ownerId, deletedAt: null },
      deletedAt: null,
    };

    beforeEach(() => {
      mockPrismaService.task.findFirst.mockResolvedValue(mockTask);
    });

    it('should successfully reorder steps', async () => {
      const existingSteps = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const stepIds = [3, 1, 2]; // New order

      mockPrismaService.step.findMany.mockResolvedValue(existingSteps);
      mockPrismaService.step.update.mockImplementation((args) =>
        Promise.resolve({ id: args.where.id, order: args.data.order }),
      );
      mockPrismaService.$transaction.mockImplementation((promises) =>
        Promise.all(promises),
      );
      mockPrismaService.step.findMany
        .mockResolvedValueOnce(existingSteps)
        .mockResolvedValueOnce([
          { id: 3, order: 1 },
          { id: 1, order: 2 },
          { id: 2, order: 3 },
        ]);

      const result = await service.reorder(taskId, ownerId, stepIds);

      expect(mockPrismaService.step.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(3);
    });

    it('should throw BadRequestException if stepIds length does not match existing steps', async () => {
      const existingSteps = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const stepIds = [1, 2]; // Missing one step

      mockPrismaService.step.findMany.mockResolvedValue(existingSteps);

      await expect(service.reorder(taskId, ownerId, stepIds)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reorder(taskId, ownerId, stepIds)).rejects.toThrow(
        'All steps must be included when reordering',
      );
    });

    it('should throw BadRequestException if stepIds contain duplicates', async () => {
      const existingSteps = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const stepIds = [1, 1, 2]; // Duplicate step ID

      mockPrismaService.step.findMany.mockResolvedValue(existingSteps);

      await expect(service.reorder(taskId, ownerId, stepIds)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reorder(taskId, ownerId, stepIds)).rejects.toThrow(
        'Duplicate step IDs are not allowed when reordering',
      );
    });

    it('should throw BadRequestException if stepId does not belong to task', async () => {
      const existingSteps = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const stepIds = [1, 2, 99]; // 99 doesn't belong to task

      mockPrismaService.step.findMany.mockResolvedValue(existingSteps);

      await expect(service.reorder(taskId, ownerId, stepIds)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reorder(taskId, ownerId, stepIds)).rejects.toThrow(
        'Step ID 99 does not belong to task',
      );
    });

    it('should throw NotFoundException if task does not exist', async () => {
      mockPrismaService.task.findFirst.mockResolvedValue(null);

      await expect(service.reorder(taskId, ownerId, [1, 2, 3])).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.reorder(taskId, ownerId, [1, 2, 3])).rejects.toThrow(
        `Task with ID ${taskId} not found`,
      );
    });
  });

  describe('create', () => {
    const taskId = 1;
    const ownerId = 1;
    const mockTask = {
      id: taskId,
      todoList: { ownerId, deletedAt: null },
      deletedAt: null,
    };

    it('should create a step successfully', async () => {
      const createDto = { description: 'Test step', completed: false };
      const mockStep = {
        id: 1,
        description: 'Test step',
        completed: false,
        taskId,
        order: 1,
      };

      mockPrismaService.task.findFirst.mockResolvedValue(mockTask);
      mockPrismaService.step.findFirst.mockResolvedValue(null); // No existing steps
      mockPrismaService.step.create.mockResolvedValue(mockStep);

      const result = await service.create(taskId, createDto, ownerId);

      expect(mockPrismaService.step.create).toHaveBeenCalledWith({
        data: {
          description: createDto.description,
          completed: createDto.completed,
          taskId,
          order: 1,
        },
      });
      expect(result).toEqual(mockStep);
    });

    it('should throw NotFoundException if task does not exist', async () => {
      mockPrismaService.task.findFirst.mockResolvedValue(null);

      await expect(
        service.create(taskId, { description: 'Test' }, ownerId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should assign correct order when steps exist', async () => {
      const createDto = { description: 'New step', completed: false };
      const existingStep = {
        id: 1,
        order: 5,
      };
      const mockStep = {
        id: 2,
        ...createDto,
        taskId,
        order: 6,
      };

      mockPrismaService.task.findFirst.mockResolvedValue(mockTask);
      mockPrismaService.step.findFirst.mockResolvedValue(existingStep);
      mockPrismaService.step.create.mockResolvedValue(mockStep);

      const result = await service.create(taskId, createDto, ownerId);

      expect(result.order).toBe(6);
    });

    it('should use default completed value if not provided', async () => {
      const createDto = { description: 'Test step' };
      const mockStep = {
        id: 1,
        description: 'Test step',
        completed: false,
        taskId,
        order: 1,
      };

      mockPrismaService.task.findFirst.mockResolvedValue(mockTask);
      mockPrismaService.step.findFirst.mockResolvedValue(null);
      mockPrismaService.step.create.mockResolvedValue(mockStep);

      await service.create(taskId, createDto, ownerId);

      expect(mockPrismaService.step.create).toHaveBeenCalledWith({
        data: {
          description: 'Test step',
          completed: false,
          taskId,
          order: 1,
        },
      });
    });
  });

  describe('update', () => {
    const stepId = 1;
    const ownerId = 1;

    it('should update step successfully', async () => {
      const mockStep = {
        id: stepId,
        description: 'Old description',
        completed: false,
        task: {
          id: 1,
          todoList: { ownerId, deletedAt: null },
          deletedAt: null,
        },
        deletedAt: null,
      };
      const updateDto = {
        description: 'New description',
        completed: true,
      };

      mockPrismaService.step.findFirst
        .mockResolvedValueOnce(mockStep)
        .mockResolvedValueOnce(mockStep);
      mockPrismaService.step.update.mockResolvedValue({
        ...mockStep,
        ...updateDto,
      });

      const result = await service.update(stepId, updateDto, ownerId);

      expect(mockPrismaService.step.update).toHaveBeenCalledWith({
        where: { id: stepId },
        data: updateDto,
      });
      expect(result.description).toBe('New description');
      expect(result.completed).toBe(true);
    });

    it('should throw NotFoundException if step does not exist', async () => {
      mockPrismaService.step.findFirst.mockResolvedValue(null);

      await expect(
        service.update(stepId, { description: 'Test' }, ownerId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const stepId = 1;
    const ownerId = 1;

    it('should soft delete step', async () => {
      const mockStep = {
        id: stepId,
        description: 'Test step',
        task: {
          id: 1,
          todoList: { ownerId, deletedAt: null },
          deletedAt: null,
        },
        deletedAt: null,
      };

      mockPrismaService.step.findFirst
        .mockResolvedValueOnce(mockStep)
        .mockResolvedValueOnce(mockStep);
      mockPrismaService.step.update.mockResolvedValue({
        ...mockStep,
        deletedAt: new Date(),
      });

      const result = await service.remove(stepId, ownerId);

      expect(mockPrismaService.step.update).toHaveBeenCalledWith({
        where: { id: stepId },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result.deletedAt).toBeDefined();
    });
  });

  describe('findAll', () => {
    const taskId = 1;
    const ownerId = 1;

    it('should return steps ordered by order field', async () => {
      const mockSteps = [
        { id: 1, order: 1, description: 'First' },
        { id: 2, order: 2, description: 'Second' },
        { id: 3, order: 3, description: 'Third' },
      ];

      const mockTask = {
        id: taskId,
        todoList: { ownerId, deletedAt: null },
        deletedAt: null,
      };

      mockPrismaService.task.findFirst.mockResolvedValue(mockTask);
      mockPrismaService.step.findMany.mockResolvedValue(mockSteps);

      const result = await service.findAll(taskId, ownerId);

      expect(mockPrismaService.step.findMany).toHaveBeenCalledWith({
        where: {
          taskId,
          deletedAt: null,
        },
        orderBy: {
          order: 'asc',
        },
      });
      expect(result).toEqual(mockSteps);
    });
  });
});
