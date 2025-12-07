import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

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

type SanitizedUser = Omit<User, 'passwordHash' | 'emailVerificationToken'>;

@Injectable()
class UsersService {
  constructor(private prisma: PrismaService) {}

  private sanitizeUser<
    T extends {
      passwordHash?: string | null;
      emailVerificationToken?: string | null;
    },
  >(user: T | null): Omit<T, 'passwordHash' | 'emailVerificationToken'> | null {
    if (!user) {
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, emailVerificationToken, ...rest } = user;
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
  ): Promise<
    Omit<UserWithRelations, 'passwordHash' | 'emailVerificationToken'>
  > {
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

  async createUser(data: CreateUserDto): Promise<SanitizedUser> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        profilePicture: data.profilePicture,
        passwordHash,
        emailVerificationToken,
        emailVerificationSentAt: new Date(),
      } as Prisma.UserCreateInput,
    });

    const sanitized = this.sanitizeUser(user);
    if (!sanitized) {
      throw new Error('Failed to create user');
    }
    return sanitized;
  }

  async verifyEmail(token: string): Promise<SanitizedUser> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        deletedAt: null,
      } as Prisma.UserWhereInput,
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    const userWithEmailVerified = user as User & { emailVerified: boolean };
    if (userWithEmailVerified.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
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

    const emailVerificationToken = crypto.randomBytes(32).toString('hex');

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken,
        emailVerificationSentAt: new Date(),
      } as Prisma.UserUpdateInput,
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
