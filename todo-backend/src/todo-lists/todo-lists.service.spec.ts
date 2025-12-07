import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { TodoListsService } from './todo-lists.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListType } from './dto/create-todo-list.dto';

describe('TodoListsService', () => {
  let service: TodoListsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    toDoList: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TodoListsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<TodoListsService>(TodoListsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const ownerId = 1;

    it('should create list with CUSTOM type by default', async () => {
      const createDto = { name: 'Test List' };
      const mockList = {
        id: 1,
        name: 'Test List',
        type: ListType.CUSTOM,
        ownerId,
      };

      mockPrismaService.toDoList.create.mockResolvedValue(mockList);

      const result = await service.create(createDto, ownerId);

      expect(mockPrismaService.toDoList.create).toHaveBeenCalledWith({
        data: {
          name: 'Test List',
          type: ListType.CUSTOM,
          ownerId,
        },
      });
      expect(result).toEqual(mockList);
    });

    it('should create list with specified type', async () => {
      const createDto = {
        name: 'Daily List',
        type: ListType.DAILY,
      };
      const mockList = {
        id: 1,
        ...createDto,
        ownerId,
      };

      mockPrismaService.toDoList.create.mockResolvedValue(mockList);

      const result = await service.create(createDto, ownerId);

      expect(result.type).toBe(ListType.DAILY);
    });
  });

  describe('findAll', () => {
    const ownerId = 1;

    it('should return all lists for owner', async () => {
      const mockLists = [
        {
          id: 1,
          name: 'List 1',
          ownerId,
          deletedAt: null,
          tasks: [],
        },
        {
          id: 2,
          name: 'List 2',
          ownerId,
          deletedAt: null,
          tasks: [],
        },
      ];

      mockPrismaService.toDoList.findMany.mockResolvedValue(mockLists);

      const result = await service.findAll(ownerId);

      expect(mockPrismaService.toDoList.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          ownerId,
        },
        include: {
          tasks: {
            where: { deletedAt: null },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { order: 'asc' },
      });
      expect(result).toEqual(mockLists);
    });

    it('should exclude deleted lists', async () => {
      const mockLists = [
        {
          id: 1,
          name: 'Active List',
          ownerId,
          deletedAt: null,
          tasks: [],
        },
      ];

      mockPrismaService.toDoList.findMany.mockResolvedValue(mockLists);

      const result = await service.findAll(ownerId);

      expect(result).toHaveLength(1);
      expect(result[0].deletedAt).toBeNull();
    });
  });

  describe('findOne', () => {
    const listId = 1;
    const ownerId = 1;

    it('should return list if found', async () => {
      const mockList = {
        id: listId,
        name: 'Test List',
        ownerId,
        deletedAt: null,
        tasks: [],
      };

      mockPrismaService.toDoList.findFirst.mockResolvedValue(mockList);

      const result = await service.findOne(listId, ownerId);

      expect(result).toEqual(mockList);
    });

    it('should throw NotFoundException if list not found', async () => {
      mockPrismaService.toDoList.findFirst.mockResolvedValue(null);

      await expect(service.findOne(999, ownerId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findOne(999, ownerId)).rejects.toThrow(
        'ToDoList with ID 999 not found',
      );
    });

    it('should include tasks and steps', async () => {
      const mockList = {
        id: listId,
        name: 'Test List',
        ownerId,
        deletedAt: null,
        tasks: [
          {
            id: 1,
            description: 'Task 1',
            steps: [{ id: 1, description: 'Step 1' }],
          },
        ],
      };

      mockPrismaService.toDoList.findFirst.mockResolvedValue(mockList);

      const result = await service.findOne(listId, ownerId);

      expect(result.tasks).toBeDefined();
      expect(result.tasks[0].steps).toBeDefined();
    });
  });

  describe('update', () => {
    const listId = 1;
    const ownerId = 1;

    it('should update list name', async () => {
      const mockList = {
        id: listId,
        name: 'Old Name',
        type: ListType.CUSTOM,
        ownerId,
        deletedAt: null,
        tasks: [],
      };

      const updateDto = { name: 'New Name' };

      mockPrismaService.toDoList.findFirst.mockResolvedValue(mockList);
      mockPrismaService.toDoList.update.mockResolvedValue({
        ...mockList,
        name: 'New Name',
      });

      const result = await service.update(listId, updateDto, ownerId);

      expect(mockPrismaService.toDoList.update).toHaveBeenCalledWith({
        where: { id: listId },
        data: {
          name: 'New Name',
          type: ListType.CUSTOM,
        },
      });
      expect(result.name).toBe('New Name');
    });

    it('should update list type', async () => {
      const mockList = {
        id: listId,
        name: 'Test List',
        type: ListType.CUSTOM,
        ownerId,
        deletedAt: null,
        tasks: [],
      };

      const updateDto = { type: ListType.DAILY };

      mockPrismaService.toDoList.findFirst.mockResolvedValue(mockList);
      mockPrismaService.toDoList.update.mockResolvedValue({
        ...mockList,
        type: ListType.DAILY,
      });

      const result = await service.update(listId, updateDto, ownerId);

      expect(result.type).toBe(ListType.DAILY);
    });

    it('should preserve existing values if not provided', async () => {
      const mockList = {
        id: listId,
        name: 'Original Name',
        type: ListType.WEEKLY,
        ownerId,
        deletedAt: null,
        tasks: [],
      };

      const updateDto = {};

      mockPrismaService.toDoList.findFirst.mockResolvedValue(mockList);
      mockPrismaService.toDoList.update.mockResolvedValue(mockList);

      const result = await service.update(listId, updateDto, ownerId);

      expect(result.name).toBe('Original Name');
      expect(result.type).toBe(ListType.WEEKLY);
    });
  });

  describe('remove', () => {
    const listId = 1;
    const ownerId = 1;

    it('should soft delete list', async () => {
      const mockList = {
        id: listId,
        name: 'Test List',
        ownerId,
        deletedAt: null,
        tasks: [],
      };

      mockPrismaService.toDoList.findFirst.mockResolvedValue(mockList);
      mockPrismaService.toDoList.update.mockResolvedValue({
        ...mockList,
        deletedAt: new Date(),
      });

      const result = await service.remove(listId, ownerId);

      expect(mockPrismaService.toDoList.update).toHaveBeenCalledWith({
        where: { id: listId },
        data: {
          deletedAt: expect.any(Date),
        },
      });
      expect(result.deletedAt).toBeDefined();
    });
  });
});

