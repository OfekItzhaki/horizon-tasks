import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ListSharesService } from './list-shares.service';
import { PrismaService } from '../prisma/prisma.service';
import { ShareListDto } from './dto/share-list.dto';

describe('ListSharesService', () => {
  let service: ListSharesService;

  const mockPrismaService = {
    toDoList: {
      findFirst: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    listShare: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListSharesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ListSharesService>(ListSharesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('shareList', () => {
    const todoListId = 1;
    const ownerId = 1;
    const shareListDto: ShareListDto = { sharedWithId: 2 };

    it('should share list successfully', async () => {
      const mockList = {
        id: todoListId,
        ownerId,
        deletedAt: null,
      };
      const mockUser = {
        id: 2,
        deletedAt: null,
      };
      const mockShare = {
        id: 1,
        sharedWithId: 2,
        toDoListId: todoListId,
        sharedWith: { id: 2, email: 'user2@example.com' },
        toDoList: mockList,
      };

      mockPrismaService.toDoList.findFirst.mockResolvedValue(mockList);
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.listShare.findUnique.mockResolvedValue(null);
      mockPrismaService.listShare.create.mockResolvedValue(mockShare);

      const result = await service.shareList(todoListId, shareListDto, ownerId);

      expect(mockPrismaService.listShare.create).toHaveBeenCalledWith({
        data: {
          sharedWithId: shareListDto.sharedWithId,
          toDoListId: todoListId,
        },
        include: expect.any(Object),
      });
      expect(result).toEqual(mockShare);
    });

    it('should throw NotFoundException if list does not exist', async () => {
      mockPrismaService.toDoList.findFirst.mockResolvedValue(null);

      await expect(
        service.shareList(todoListId, shareListDto, ownerId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const mockList = {
        id: todoListId,
        ownerId,
        deletedAt: null,
      };

      mockPrismaService.toDoList.findFirst.mockResolvedValue(mockList);
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.shareList(todoListId, shareListDto, ownerId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.shareList(todoListId, shareListDto, ownerId),
      ).rejects.toThrow('User with ID 2 not found');
    });

    it('should throw ConflictException if list is already shared', async () => {
      const mockList = {
        id: todoListId,
        ownerId,
        deletedAt: null,
      };
      const mockUser = {
        id: 2,
        deletedAt: null,
      };
      const existingShare = {
        id: 1,
        sharedWithId: 2,
        toDoListId: todoListId,
      };

      mockPrismaService.toDoList.findFirst.mockResolvedValue(mockList);
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.listShare.findUnique.mockResolvedValue(existingShare);

      await expect(
        service.shareList(todoListId, shareListDto, ownerId),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.shareList(todoListId, shareListDto, ownerId),
      ).rejects.toThrow('List is already shared with this user');
    });
  });

  describe('getSharedLists', () => {
    const userId = 1;

    it('should return shared lists for user', async () => {
      const mockShares = [
        {
          id: 1,
          toDoList: {
            id: 1,
            name: 'Shared List',
            deletedAt: null,
            owner: {
              id: 2,
              email: 'owner@example.com',
              name: 'Owner',
              profilePicture: null,
            },
            tasks: [],
          },
        },
      ];

      mockPrismaService.listShare.findMany.mockResolvedValue(mockShares);

      const result = await service.getSharedLists(userId);

      expect(mockPrismaService.listShare.findMany).toHaveBeenCalledWith({
        where: {
          sharedWithId: userId,
        },
        include: {
          toDoList: {
            include: {
              owner: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                  profilePicture: true,
                },
              },
              tasks: {
                where: { deletedAt: null },
                orderBy: { order: 'asc' },
              },
            },
          },
        },
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Shared List');
    });
  });
});
