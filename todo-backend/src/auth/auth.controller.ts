import { Body, Controller, Post, Param, HttpCode, HttpStatus, Res, Req, UseGuards } from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import {
  RegisterStartDto,
  RegisterVerifyDto,
  RegisterFinishDto,
} from './dto/register-multi-step.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import UsersService from '../users/users.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from './current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) { }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Returns JWT access token and user data, sets refresh token cookie',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto.email, loginDto.password);
    this.setRefreshTokenCookie(response, result.refreshToken);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refreshToken, ...rest } = result;
    return rest;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Returns new access token' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = request.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const result = await this.authService.refreshAccessToken(refreshToken);
    this.setRefreshTokenCookie(response, result.refreshToken);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refreshToken: _unused, ...rest } = result;
    return rest;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and revoke refresh tokens' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @CurrentUser() user: CurrentUserPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(user.userId);
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh',
    });
    return { message: 'Logged out' };
  }

  private setRefreshTokenCookie(response: Response, token: string) {
    response.cookie('refresh_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/api/v1/auth/refresh', // Only send to refresh endpoint
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }

  @Post('verify-email/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Param('token') token: string) {
    return this.usersService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification' })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async resendVerification(
    @Body() resendVerificationDto: ResendVerificationDto,
  ) {
    return this.usersService.resendVerificationEmail(
      resendVerificationDto.email,
    );
  }

  @Post('register/start')
  @ApiOperation({ summary: 'Start registration by sending OTP' })
  @ApiResponse({ status: 201, description: 'OTP sent successfully' })
  registerStart(@Body() dto: RegisterStartDto) {
    return this.authService.registerStart(dto.email);
  }

  @Post('register/verify')
  @ApiOperation({ summary: 'Verify OTP and return a registration token' })
  @ApiResponse({ status: 200, description: 'OTP verified' })
  registerVerify(@Body() dto: RegisterVerifyDto) {
    return this.authService.registerVerify(dto.email, dto.otp);
  }

  @Post('register/finish')
  @ApiOperation({ summary: 'Complete registration with password' })
  @ApiResponse({ status: 201, description: 'User registered and logged in' })
  async registerFinish(
    @Body() dto: RegisterFinishDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }
    const result = await this.authService.registerFinish(dto.registrationToken, dto.password);
    this.setRefreshTokenCookie(response, result.refreshToken);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { refreshToken, ...rest } = result;
    return rest;
  }
}
