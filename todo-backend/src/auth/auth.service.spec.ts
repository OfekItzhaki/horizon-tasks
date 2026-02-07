import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import UsersService from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;

  const mockUsersService = {
    findByEmail: jest.fn(),
    initUser: jest.fn(),
    sendOtp: jest.fn(),
    setPassword: jest.fn(),
    generatePasswordResetOtp: jest.fn(),
    verifyPasswordResetOtp: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockPrismaService = {
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
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
        {
          provide: PrismaService,
          useValue: mockPrismaService,
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
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        name: 'Test User',
        emailVerified: true,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'test@example.com',
        'password123',
      );

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('email', 'test@example.com');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user has no passwordHash', async () => {
      const mockUser = {
        id: '1',
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
        id: '1',
        email: 'test@example.com',
        passwordHash: 'hashed-password',
        emailVerified: true,
      };

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token and user on successful login', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed-password',
        emailVerified: true,
      };

      const mockToken = 'jwt-token';

      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue(mockToken);

      const result = await service.login('test@example.com', 'password123');

      expect(result).toHaveProperty('accessToken', mockToken);
      expect(result).toHaveProperty('user');
      expect(result.user).not.toHaveProperty('passwordHash');

      expect(mockJwtService.sign).toHaveBeenCalled();
    });
  });

  describe('registration flow', () => {
    it('registerStart should initiate registration', async () => {
      mockUsersService.initUser.mockResolvedValue({
        id: '1',
        email: 'test@example.com',
        emailVerificationOtp: '123456',
      });
      mockUsersService.sendOtp.mockResolvedValue(undefined);

      const result = await service.registerStart('test@example.com');

      expect(result).toEqual({ message: 'OTP sent' });
      expect(mockUsersService.initUser).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('registerVerify should return token for valid OTP', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        emailVerificationOtp: '123456',
        emailVerificationExpiresAt: new Date(Date.now() + 10000),
      };
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('reg-token');

      const result = await service.registerVerify('test@example.com', '123456');

      expect(result).toEqual({ registrationToken: 'reg-token' });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({ purpose: 'registration' }),
        expect.any(Object),
      );
    });
  });

  describe('forgot password flow', () => {
    it('forgotPassword should call usersService', async () => {
      mockUsersService.generatePasswordResetOtp.mockResolvedValue({
        message: 'OTP sent',
      });
      const result = await service.forgotPassword('test@example.com');
      expect(result).toEqual({ message: 'OTP sent' });
      expect(mockUsersService.generatePasswordResetOtp).toHaveBeenCalledWith(
        'test@example.com',
      );
    });

    it('verifyResetOtp should return reset token for valid OTP', async () => {
      const mockUser = { id: '1', email: 'test@example.com' };
      mockUsersService.verifyPasswordResetOtp.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('reset-token');

      const result = await service.verifyResetOtp('test@example.com', '123456');

      expect(result).toEqual({ resetToken: 'reset-token' });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: '1',
          purpose: 'password_reset',
          email: 'test@example.com',
        }),
        expect.objectContaining({ expiresIn: '15m' }),
      );
    });

    it('resetPassword should update password for valid token', async () => {
      const mockPayload = {
        sub: '1',
        purpose: 'password_reset',
        email: 'test@example.com',
      };
      mockJwtService.verify.mockReturnValue(mockPayload);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hash');

      mockPrismaService.user.update.mockResolvedValue({ id: '1' });

      const result = await service.resetPassword(
        'test@example.com',
        'valid-token',
        'new-password',
      );

      expect(result).toEqual({ message: 'Password reset successful' });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: expect.objectContaining({
          passwordHash: 'new-hash',
          passwordResetOtp: null,
        }),
      });
    });

    it('resetPassword should throw if token is for different email', async () => {
      const mockPayload = {
        sub: '1',
        purpose: 'password_reset',
        email: 'wrong@example.com',
      };
      mockJwtService.verify.mockReturnValue(mockPayload);

      await expect(
        service.resetPassword(
          'test@example.com',
          'valid-token',
          'new-password',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
