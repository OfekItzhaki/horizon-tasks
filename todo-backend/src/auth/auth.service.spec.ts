import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import UsersService from '../users/users.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user without passwordHash if credentials are valid', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id', 1);
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('nonexistent@example.com', 'password123'),
      ).rejects.toThrow('Invalid credentials');
    });

    it('should throw UnauthorizedException if user has no passwordHash', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: null,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.validateUser('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        passwordHash: 'hashed-password',
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('login', () => {
    it('should return access token and user on successful login', async () => {
      const mockUser = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
      };

      const mockToken = 'jwt-token';

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken', mockToken);
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        email: 'test@example.com',
      });
    });

    it('should throw UnauthorizedException on invalid credentials', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
