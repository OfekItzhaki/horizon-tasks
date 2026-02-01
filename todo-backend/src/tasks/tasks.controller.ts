import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetTasksByDateDto } from './dto/get-tasks-by-date.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/current-user.decorator';
import { CreateTaskCommand } from './commands/create-task.command';
import { UpdateTaskCommand } from './commands/update-task.command';
import { RemoveTaskCommand } from './commands/remove-task.command';
import { RestoreTaskCommand } from './commands/restore-task.command';
import { PermanentDeleteTaskCommand } from './commands/permanent-delete-task.command';
import { GetTaskQuery } from './queries/get-task.query';
import { GetTasksQuery } from './queries/get-tasks.query';
import { GetTasksByDateQuery } from './queries/get-tasks-by-date.query';
import { GetTasksWithRemindersQuery } from './queries/get-tasks-with-reminders.query';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('todo-list/:todoListId')
  @ApiOperation({ summary: 'Create a new task in a list' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 404, description: 'List not found' })
  create(
    @Param('todoListId', ParseIntPipe) todoListId: number,
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commandBus.execute(
      new CreateTaskCommand(todoListId, createTaskDto, user.userId),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks (optionally filtered by list)' })
  @ApiQuery({
    name: 'todoListId',
    required: false,
    type: Number,
    description: 'Filter tasks by list ID',
  })
  @ApiResponse({ status: 200, description: 'Returns tasks' })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('todoListId') todoListId?: string,
  ) {
    const listId = todoListId ? parseInt(todoListId, 10) : undefined;
    return this.queryBus.execute(new GetTasksQuery(user.userId, listId));
  }

  @Get('by-date')
  @ApiOperation({ summary: 'Get tasks for a specific date' })
  @ApiResponse({ status: 200, description: 'Returns tasks for the date' })
  getTasksByDate(
    @Query() query: GetTasksByDateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const date = query.date ? new Date(query.date) : new Date();
    return this.queryBus.execute(new GetTasksByDateQuery(user.userId, date));
  }

  @Get('reminders')
  @ApiOperation({ summary: 'Get tasks with reminders for a specific date' })
  @ApiResponse({
    status: 200,
    description: 'Returns tasks with reminders',
  })
  getTasksWithReminders(
    @Query() query: GetTasksByDateDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const date = query.date ? new Date(query.date) : new Date();
    return this.queryBus.execute(
      new GetTasksWithRemindersQuery(user.userId, date),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Returns task with steps' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.queryBus.execute(new GetTaskQuery(id, user.userId));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commandBus.execute(
      new UpdateTaskCommand(id, updateTaskDto, user.userId),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commandBus.execute(new RemoveTaskCommand(id, user.userId));
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore archived task to original list' })
  @ApiResponse({ status: 200, description: 'Task restored successfully' })
  @ApiResponse({ status: 400, description: 'Task cannot be restored' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commandBus.execute(new RestoreTaskCommand(id, user.userId));
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete archived task' })
  @ApiResponse({ status: 200, description: 'Task permanently deleted' })
  @ApiResponse({
    status: 400,
    description: 'Task cannot be permanently deleted',
  })
  @ApiResponse({ status: 404, description: 'Task not found' })
  permanentDelete(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commandBus.execute(
      new PermanentDeleteTaskCommand(id, user.userId),
    );
  }
}
