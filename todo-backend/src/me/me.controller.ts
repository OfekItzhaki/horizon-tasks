import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/current-user.decorator';
import { TodoListsService } from '../todo-lists/todo-lists.service';
import { TasksService } from '../tasks/tasks.service';

@ApiTags('Me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(
    private readonly todoListsService: TodoListsService,
    private readonly tasksService: TasksService,
  ) {}

  @Get('lists')
  @ApiOperation({ summary: 'Get my lists (alias for GET /todo-lists)' })
  @ApiResponse({ status: 200, description: 'Returns all user lists' })
  getMyLists(@CurrentUser() user: CurrentUserPayload) {
    return this.todoListsService.findAll(user.userId);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Get my tasks (alias for GET /tasks)' })
  @ApiQuery({
    name: 'todoListId',
    required: false,
    type: Number,
    description: 'Filter tasks by list ID',
  })
  @ApiResponse({ status: 200, description: 'Returns user tasks' })
  getMyTasks(
    @CurrentUser() user: CurrentUserPayload,
    @Query('todoListId') todoListId?: string,
  ) {
    const listId = todoListId ? parseInt(todoListId, 10) : undefined;
    return this.tasksService.findAll(user.userId, listId);
  }
}
