import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import UsersService from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/current-user.decorator';

interface CloudinaryResponse {
  secure_url: string;
  [key: string]: any;
}

interface CloudinaryError {
  message: string;
}
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { FileUploadInterceptor } from './interceptors/file-upload.interceptor';

@ApiTags('Users')
@Controller('users')
class UsersController {
  constructor(
    private userService: UsersService,
    private cloudinaryService: CloudinaryService,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully (default lists are auto-created)',
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createUser(@Body() data: CreateUserDto) {
    return this.userService.createUser(data);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns current user' })
  async getUsers(@CurrentUser() user: CurrentUserPayload) {
    return this.userService.getAllUsers(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'Returns user data' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only access own profile',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.userService.getUser(id, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only update own profile',
  })
  async updateUser(
    @Param('id') id: string,
    @Body() data: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.userService.updateUser(id, data, user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/upload-avatar')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload profile picture' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile picture uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only upload to own profile',
  })
  @UseInterceptors(FileInterceptor('file'), FileUploadInterceptor)
  async uploadAvatar(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (id !== user.userId) {
      throw new BadRequestException('You can only upload to your own profile');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Upload to Cloudinary
    const result = (await this.cloudinaryService.uploadFile(file)) as unknown;

    if (!result || typeof result !== 'object' || !('secure_url' in result)) {
      const errorResponse = result as CloudinaryError;
      throw new BadRequestException(
        `Cloudinary upload failed: ${errorResponse?.message || 'Unknown error'}`,
      );
    }

    const uploadResponse = result as Record<string, unknown>;
    const secureUrl = uploadResponse.secure_url as string;

    // Update user profile with the Cloudinary secure URL
    return this.userService.updateUser(
      id,
      { profilePicture: secureUrl },
      user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft delete user account' })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - can only delete own account',
  })
  async deleteUser(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.userService.deleteUser(id, user.userId);
  }
}
export default UsersController;
