import { Body, Controller, Post, Param } from '@nestjs/common';
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
import { BadRequestException } from '@nestjs/common';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Returns JWT access token and user data',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Post('verify-email/:token')
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Param('token') token: string) {
    return this.usersService.verifyEmail(token);
  }

  @Post('resend-verification')
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
  registerFinish(@Body() dto: RegisterFinishDto) {
    if (dto.password !== dto.passwordConfirm) {
      throw new BadRequestException('Passwords do not match');
    }
    return this.authService.registerFinish(dto.registrationToken, dto.password);
  }
}
