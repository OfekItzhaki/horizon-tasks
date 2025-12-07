import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import UsersService from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListType } from '../todo-lists/dto/create-todo-list.dto';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
jest.mock('crypto');

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    toDoList: {
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const createUserDto: CreateUserDto = {
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    };

    it('should create user and default lists', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed',
        emailVerificationToken: 'token',
        emailVerificationSentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        profilePicture: null,
        emailVerified: false,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.toDoList.createMany.mockResolvedValue({ count: 4 });

      const result = await service.createUser(createUserDto);

      expect(mockPrismaService.user.create).toHaveBeenCalled();
      expect(mockPrismaService.toDoList.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          { name: 'Daily', type: ListType.DAILY, ownerId: 1 },
          { name: 'Weekly', type: ListType.WEEKLY, ownerId: 1 },
          { name: 'Monthly', type: ListType.MONTHLY, ownerId: 1 },
          { name: 'Yearly', type: ListType.YEARLY, ownerId: 1 },
        ]),
      });
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('emailVerificationToken');
    });

    it('should hash password before storing', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'hashed',
        emailVerificationToken: 'token',
        emailVerificationSentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        profilePicture: null,
        emailVerified: false,
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockPrismaService.toDoList.createMany.mockResolvedValue({ count: 4 });

      await service.createUser(createUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });
  });

  describe('getUser', () => {
    const userId = 1;
    const requestingUserId = 1;

    it('should return user if found and authorized', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed',
        emailVerificationToken: 'token',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        profilePicture: null,
        lists: [],
        shares: [],
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.getUser(userId, requestingUserId);

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('emailVerificationToken');
    });

    it('should throw ForbiddenException if accessing another user', async () => {
      await expect(service.getUser(1, 2)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.getUser(1, 2)).rejects.toThrow(
        'You can only access your own profile',
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.getUser(999, 999)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateUser', () => {
    const userId = 1;
    const requestingUserId = 1;

    it('should update user successfully', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Old Name',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        profilePicture: null,
        lists: [],
        shares: [],
      };

      const updateDto: UpdateUserDto = {
        name: 'New Name',
      };

      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockUser) // getUser call
        .mockResolvedValueOnce(mockUser); // findOne call
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        name: 'New Name',
      });

      const result = await service.updateUser(userId, updateDto, requestingUserId);

      expect(mockPrismaService.user.update).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    it('should hash new password if provided', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'old-hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        profilePicture: null,
        lists: [],
        shares: [],
      };

      const updateDto: UpdateUserDto = {
        password: 'newpassword123',
      };

      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      await service.updateUser(userId, updateDto, requestingUserId);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpassword123', 10);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordHash: 'new-hash',
          }),
        }),
      );
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        emailVerified: false,
        emailVerificationToken: 'valid-token',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        profilePicture: null,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
        emailVerificationToken: null,
      });

      const result = await service.verifyEmail('valid-token');

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            emailVerified: true,
            emailVerificationToken: null,
          },
        }),
      );
      expect(result).not.toHaveProperty('emailVerificationToken');
    });

    it('should throw BadRequestException for invalid token', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        'Invalid or expired verification token',
      );
    });

    it('should throw BadRequestException if email already verified', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        emailVerified: true,
        emailVerificationToken: 'token',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        profilePicture: null,
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      await expect(service.verifyEmail('token')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.verifyEmail('token')).rejects.toThrow(
        'Email is already verified',
      );
    });
  });

  describe('deleteUser', () => {
    const userId = 1;
    const requestingUserId = 1;

    it('should soft delete user', async () => {
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        profilePicture: null,
        lists: [],
        shares: [],
      };

      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        deletedAt: new Date(),
      });

      const result = await service.deleteUser(userId, requestingUserId);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            deletedAt: expect.any(Date),
          },
        }),
      );
      expect(result.deletedAt).toBeDefined();
    });
  });
});

