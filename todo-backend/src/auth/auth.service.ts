import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import UsersService from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) { }

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.passwordHash) {
      this.logger.debug(`Login failed: no user or hash for email=${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      this.logger.debug(`Login failed: invalid password for userId=${user.id}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    return this.createAuthSession(user);
  }

  private async createAuthSession(user: Omit<NonNullable<Awaited<ReturnType<typeof this.usersService.findByEmail>>>, 'passwordHash'>) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' }); // Short-lived
    const refreshToken = await this.generateRefreshToken(user.id);

    this.logger.log(`Auth session created: userId=${user.id}`);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  async generateRefreshToken(userId: string): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.prisma.refreshToken.create({
      data: {
        token: await bcrypt.hash(token, 10),
        userId,
        expiresAt,
      },
    });

    // Return plain token to be signed/sent to user
    return this.jwtService.sign(
      { jti: token, sub: userId },
      { expiresIn: '7d', secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret' },
    );
  }

  async refreshAccessToken(token: string) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      });

      const refreshTokenRecord = await this.prisma.refreshToken.findFirst({
        where: {
          userId: payload.sub,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });

      if (!refreshTokenRecord) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Check if the token matches (hashing)
      const isMatch = await bcrypt.compare(payload.jti, refreshTokenRecord.token);
      if (!isMatch) {
        throw new UnauthorizedException('Token mismatch');
      }

      // Revoke the old one (Rotation)
      await this.prisma.refreshToken.update({
        where: { id: refreshTokenRecord.id },
        data: { revokedAt: new Date() },
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.createAuthSession(user);
    } catch (e) {
      this.logger.error('Refresh token failed:', e);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async registerStart(email: string) {
    try {
      this.logger.debug(`registerStart: email=${email}`);
      const user = await this.usersService.initUser(email);
      this.logger.debug(`registerStart: user initialized, id=${user.id}`);

      try {
        await this.usersService.sendOtp(
          user.email,
          user.emailVerificationOtp!,
          user.name || undefined,
        );
      } catch (emailError) {
        const message =
          emailError instanceof Error ? emailError.message : String(emailError);
        this.logger.warn(
          `Failed to send OTP email to ${email}, but proceeding: ${message}`,
        );
      }

      this.logger.log(`Registration started: email=${email}`);
      return { message: 'OTP sent' };
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`registerStart failed for email=${email}:`, stack);
      throw error;
    }
  }

  async registerVerify(email: string, otp: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.emailVerificationOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }
    const now = new Date();
    if (
      user.emailVerificationExpiresAt &&
      user.emailVerificationExpiresAt < now
    ) {
      throw new BadRequestException('OTP expired');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      purpose: 'registration',
    };
    return {
      registrationToken: this.jwtService.sign(payload, { expiresIn: '15m' }),
    };
  }

  async registerFinish(token: string, password: string) {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        purpose: string;
        email: string;
      }>(token);
      if (payload.purpose !== 'registration') {
        throw new BadRequestException('Invalid token');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await this.usersService.setPassword(
        payload.sub,
        passwordHash,
      );

      return this.login(user.email, password);
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException('Invalid or expired registration token');
    }
  }
}
