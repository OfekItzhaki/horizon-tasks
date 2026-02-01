import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/current-user.decorator';
import { GetTodoListsQuery } from '../todo-lists/queries/get-todo-lists.query';
import { GetTasksQuery } from '../tasks/queries/get-tasks.query';

@ApiTags('Me')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('lists')
  @ApiOperation({ summary: 'Get my lists (alias for GET /todo-lists)' })
  @ApiResponse({ status: 200, description: 'Returns all user lists' })
  getMyLists(@CurrentUser() user: CurrentUserPayload) {
    return this.queryBus.execute(new GetTodoListsQuery(user.userId));
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
    return this.queryBus.execute(new GetTasksQuery(user.userId, listId));
  }
}
