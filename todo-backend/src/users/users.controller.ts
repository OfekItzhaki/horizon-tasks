import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { fileStorageConfig } from './utils/file-storage.config';
import { FileUploadInterceptor } from './interceptors/file-upload.interceptor';

@ApiTags('Users')
@Controller('users')
class UsersController {
  constructor(private userService: UsersService) {}

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
    @Param('id', ParseIntPipe) id: number,
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
    @Param('id', ParseIntPipe) id: number,
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
  @UseInterceptors(
    FileInterceptor('file', fileStorageConfig),
    FileUploadInterceptor,
  )
  async uploadAvatar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    if (id !== user.userId) {
      throw new BadRequestException('You can only upload to your own profile');
    }

    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Store only the filename. The frontend getAssetUrl will handle prepending /uploads/
    const fileName = file.filename;

    // Update user profile with new picture filename
    return this.userService.updateUser(
      id,
      { profilePicture: fileName },
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
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.userService.deleteUser(id, user.userId);
  }
}
export default UsersController;
