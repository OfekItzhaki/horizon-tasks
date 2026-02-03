import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import UsersService from '../users/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

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

    if (!user.emailVerified) {
      this.logger.debug(
        `Login failed: email not verified for userId=${user.id}`,
      );
      throw new UnauthorizedException('Email not verified');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    const payload = { sub: user.id, email: user.email };

    this.logger.log(`User logged in: userId=${user.id} email=${user.email}`);

    return {
      accessToken: this.jwtService.sign(payload),
      user,
    };
  }
}
