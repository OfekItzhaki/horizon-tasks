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
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateStepDto } from './dto/create-step.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/current-user.decorator';
import { CreateStepCommand } from './commands/create-step.command';
import { GetStepsQuery } from './queries/get-steps.query';
import { UpdateStepCommand } from './commands/update-step.command';
import { RemoveStepCommand } from './commands/remove-step.command';
import { ReorderStepsCommand } from './commands/reorder-steps.command';

@ApiTags('Steps')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class StepsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) { }

  @Post('tasks/:taskId/steps')
  @ApiOperation({ summary: 'Create a new step (sub-task)' })
  @ApiResponse({ status: 201, description: 'Step created successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  create(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() createStepDto: CreateStepDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commandBus.execute(
      new CreateStepCommand(taskId, createStepDto, user.userId),
    );
  }

  @Get('tasks/:taskId/steps')
  @ApiOperation({ summary: 'Get all steps for a task' })
  @ApiResponse({ status: 200, description: 'Returns ordered steps' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  findAll(
    @Param('taskId', ParseIntPipe) taskId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.queryBus.execute(new GetStepsQuery(taskId, user.userId));
  }

  @Patch('steps/:id')
  @ApiOperation({ summary: 'Update step' })
  @ApiResponse({ status: 200, description: 'Step updated successfully' })
  @ApiResponse({ status: 404, description: 'Step not found' })
  update(
    @Param('id', ParseIntPipe) stepId: number,
    @Body() updateStepDto: UpdateStepDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commandBus.execute(
      new UpdateStepCommand(stepId, updateStepDto, user.userId),
    );
  }

  @Delete('steps/:id')
  @ApiOperation({ summary: 'Soft delete step' })
  @ApiResponse({ status: 200, description: 'Step deleted successfully' })
  @ApiResponse({ status: 404, description: 'Step not found' })
  remove(
    @Param('id', ParseIntPipe) stepId: number,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commandBus.execute(new RemoveStepCommand(stepId, user.userId));
  }

  @Patch('tasks/:taskId/steps/reorder')
  @ApiOperation({ summary: 'Reorder steps (for drag-and-drop)' })
  @ApiResponse({ status: 200, description: 'Steps reordered successfully' })
  @ApiResponse({ status: 400, description: 'Invalid step IDs or duplicates' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  reorder(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() { stepIds }: ReorderStepsDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.commandBus.execute(
      new ReorderStepsCommand(taskId, user.userId, stepIds),
    );
  }
}
