import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { User, Prisma, ListType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

type UserWithRelations = Prisma.UserGetPayload<{
  include: {
    lists: {
      include: {
        tasks: true;
      };
    };
    shares: {
      include: {
        toDoList: {
          include: {
            tasks: true;
          };
        };
      };
    };
  };
}>;

type SanitizedUser = Omit<User, 'passwordHash' | 'emailVerificationOtp'>;

@Injectable()
class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private sanitizeUser<
    T extends {
      passwordHash?: string | null;
      emailVerificationOtp?: string | null;
    },
  >(user: T | null): Omit<T, 'passwordHash' | 'emailVerificationOtp'> | null {
    if (!user) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, emailVerificationOtp, ...rest } = user;
    return rest;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
    });
  }

  async getAllUsers(requestingUserId: number): Promise<SanitizedUser[]> {
    const user = await this.getUser(requestingUserId, requestingUserId);
    return user ? [user] : [];
  }

  async getUser(
    id: number,
    requestingUserId: number,
  ): Promise<Omit<UserWithRelations, 'passwordHash' | 'emailVerificationOtp'>> {
    if (id !== requestingUserId) {
      throw new ForbiddenException('You can only access your own profile');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        lists: {
          where: {
            deletedAt: null,
          },
          include: {
            tasks: {
              where: {
                deletedAt: null,
              },
            },
          },
        },
        shares: {
          include: {
            toDoList: {
              include: {
                tasks: {
                  where: {
                    deletedAt: null,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Filter out shares with deleted toDoList and their deleted tasks
    const sanitized: UserWithRelations = {
      ...user,
      shares: user.shares
        .filter((share) => share.toDoList && share.toDoList.deletedAt === null)
        .map((share) => ({
          ...share,
          toDoList: {
            ...share.toDoList,
            tasks: share.toDoList.tasks.filter(
              (task) => task.deletedAt === null,
            ),
          },
        })),
    };

    const result = this.sanitizeUser(sanitized);
    if (!result) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return result;
  }

  private async createDefaultLists(userId: number) {
    const defaultLists: Array<{
      name: string;
      type: ListType;
      isSystem?: boolean;
    }> = [
      { name: 'Daily', type: ListType.DAILY },
      { name: 'Weekly', type: ListType.WEEKLY },
      { name: 'Monthly', type: ListType.MONTHLY },
      { name: 'Yearly', type: ListType.YEARLY },
      // System list for archived completed tasks (created once per user)
      { name: 'Finished Tasks', type: ListType.FINISHED, isSystem: true },
    ];

    await this.prisma.toDoList.createMany({
      data: defaultLists.map((list) => ({
        name: list.name,
        type: list.type,
        isSystem: Boolean(list.isSystem ?? false),
        ownerId: userId,
      })),
    });
  }

  async initUser(email: string): Promise<User> {
    console.log(`initUser: starting for ${email}`);
    const existingUser = await this.findByEmail(email);
    console.log(`initUser: existingUser check done, found: ${!!existingUser}`);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes for registration

    if (existingUser) {
      if (existingUser.emailVerified) {
        console.log(`initUser: email already verified`);
        throw new BadRequestException(
          'Email is already registered and verified',
        );
      }
      console.log(`initUser: updating existing unverified user`);
      // Update existing unverified user with new OTP
      return this.prisma.user.update({
        where: { id: existingUser.id },
        data: {
          emailVerificationOtp: otp,
          emailVerificationExpiresAt: expiresAt,
          emailVerificationSentAt: new Date(),
          emailVerificationAttempts: 0,
        },
      });
    }

    console.log(`initUser: creating new unverified user`);
    const user = await this.prisma.user.create({
      data: {
        email,
        emailVerificationOtp: otp,
        emailVerificationExpiresAt: expiresAt,
        emailVerificationSentAt: new Date(),
        emailVerificationAttempts: 0,
        name: email.split('@')[0],
      },
    });

    console.log(
      `initUser: user created, id=${user.id}. creating default lists...`,
    );
    // Create default lists for the new user
    await this.createDefaultLists(user.id);
    console.log(`initUser: default lists created`);

    return user;
  }

  async sendOtp(email: string, otp: string, name?: string) {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
    await this.emailService.sendVerificationEmail(email, otp, name);
  }

  async setPassword(userId: number, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        emailVerified: true,
        emailVerificationOtp: null,
        emailVerificationExpiresAt: null,
      },
    });
  }

  async createUser(data: CreateUserDto): Promise<SanitizedUser> {
    // Keep original method for compatibility if needed, but refactored
    const passwordHash = await bcrypt.hash(data.password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        profilePicture: data.profilePicture,
        passwordHash,
        emailVerificationOtp: otp,
        emailVerificationSentAt: new Date(),
        emailVerificationExpiresAt: expiresAt,
      } as Prisma.UserCreateInput,
    });

    await this.createDefaultLists(user.id);
    this.sendOtp(user.email, otp, user.name || undefined).catch(console.error);

    return this.sanitizeUser(user)!;
  }

  async verifyEmail(otp: string): Promise<SanitizedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationOtp: otp,
        deletedAt: null,
      } as Prisma.UserWhereInput,
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    if (
      user.emailVerificationExpiresAt &&
      user.emailVerificationExpiresAt < new Date()
    ) {
      throw new BadRequestException('Verification code has expired');
    }

    const userWithEmailVerified = user as User & { emailVerified: boolean };
    if (userWithEmailVerified.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationOtp: null,
        emailVerificationExpiresAt: null,
      } as Prisma.UserUpdateInput,
    });

    const sanitized = this.sanitizeUser(updatedUser);
    if (!sanitized) {
      throw new Error('Failed to verify email');
    }
    return sanitized;
  }

  async resendVerificationEmail(email: string): Promise<SanitizedUser> {
    const user = await this.findByEmail(email);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userWithEmailVerified = user as User & { emailVerified: boolean };
    if (userWithEmailVerified.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    // Rate Limit: 5 seconds
    if (user.emailVerificationSentAt) {
      const diff =
        new Date().getTime() - new Date(user.emailVerificationSentAt).getTime();
      if (diff < 5000) {
        throw new BadRequestException('Please wait 5 seconds before resending');
      }
    }

    // Max Attempts: 5
    if (user.emailVerificationAttempts >= 5) {
      throw new BadRequestException(
        'Too many attempts. Please try again later.',
      );
    }

    const emailVerificationOtp = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationOtp,
        emailVerificationSentAt: new Date(),
        emailVerificationExpiresAt: expiresAt,
        emailVerificationAttempts: { increment: 1 },
      } as Prisma.UserUpdateInput,
    });

    // Log for Dev
    console.log(`[DEV] Resent OTP for ${email}: ${emailVerificationOtp}`);

    // Send verification email (don't await to avoid blocking response)
    this.emailService
      .sendVerificationEmail(
        updatedUser.email,
        emailVerificationOtp,
        updatedUser.name || undefined,
      )
      .catch((error) => {
        console.error('Failed to send verification email:', error);
      });

    const sanitized = this.sanitizeUser(updatedUser);
    if (!sanitized) {
      throw new Error('Failed to resend verification email');
    }
    return sanitized;
  }

  async updateUser(
    id: number,
    data: UpdateUserDto,
    requestingUserId: number,
  ): Promise<SanitizedUser> {
    await this.getUser(id, requestingUserId); // This will throw if user doesn't exist or unauthorized

    const updateData: Prisma.UserUpdateInput = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.profilePicture !== undefined)
      updateData.profilePicture = data.profilePicture;
    if (data.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
    }
    if (data.notificationFrequency !== undefined) {
      updateData.notificationFrequency = data.notificationFrequency;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    const sanitized = this.sanitizeUser(user);
    if (!sanitized) {
      throw new Error('Failed to update user');
    }
    return sanitized;
  }

  async deleteUser(
    id: number,
    requestingUserId: number,
  ): Promise<SanitizedUser> {
    await this.getUser(id, requestingUserId); // This will throw if user doesn't exist

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    const sanitized = this.sanitizeUser(user);
    if (!sanitized) {
      throw new Error('Failed to delete user');
    }
    return sanitized;
  }
}
export default UsersService;
