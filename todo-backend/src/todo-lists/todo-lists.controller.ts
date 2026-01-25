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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TodoListsService } from './todo-lists.service';
import { CreateToDoListDto } from './dto/create-todo-list.dto';
import { UpdateToDoListDto } from './dto/update-todo-list.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/current-user.decorator';

@ApiTags('To-Do Lists')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('todo-lists')
export class TodoListsController {
  constructor(private readonly todoListsService: TodoListsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new to-do list' })
  @ApiResponse({ status: 201, description: 'List created successfully' })
  create(
    @Body() createToDoListDto: CreateToDoListDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.todoListsService.create(createToDoListDto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user lists (includes default lists)' })
  @ApiResponse({ status: 200, description: 'Returns all lists' })
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.todoListsService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get list by ID' })
  @ApiResponse({ status: 200, description: 'Returns list with tasks' })
  @ApiResponse({ status: 404, description: 'List not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.todoListsService.findOne(id, user.userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update list' })
  @ApiResponse({ status: 200, description: 'List updated successfully' })
  @ApiResponse({ status: 404, description: 'List not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateToDoListDto: UpdateToDoListDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.todoListsService.update(id, updateToDoListDto, user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete list' })
  @ApiResponse({ status: 200, description: 'List deleted successfully' })
  @ApiResponse({ status: 404, description: 'List not found' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.todoListsService.remove(id, user.userId);
  }
}
