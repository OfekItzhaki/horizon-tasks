import { Controller, Get, Post, Param, Body, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { UserService } from './user.service';
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name?: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UserService) {}

  @Post()
  async create(@Body() body: CreateUserDto) {
    try {
      const result = await this.usersService.createUser(body);
      return result;
      
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.usersService.getUserById(Number(id));
  }
}
