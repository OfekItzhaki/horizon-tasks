import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { RemindersService } from './reminders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CurrentUser,
  CurrentUserPayload,
} from '../auth/current-user.decorator';
import { GetTasksByDateDto } from '../tasks/dto/get-tasks-by-date.dto';

@ApiTags('Reminders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get('today')
  @ApiOperation({
    summary: 'Get reminder notifications for today',
    description:
      'Returns formatted reminder notifications that can be used by front-end for push notifications',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of reminder notifications',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          taskId: { type: 'number', example: 1 },
          taskDescription: { type: 'string', example: 'Complete project' },
          dueDate: { type: 'string', format: 'date-time', nullable: true },
          reminderDate: { type: 'string', format: 'date-time' },
          message: {
            type: 'string',
            example: '"Complete project" from Daily is due tomorrow.',
          },
          title: {
            type: 'string',
            example: 'Reminder: Complete project',
          },
          listName: { type: 'string', example: 'Daily' },
          listType: { type: 'string', example: 'DAILY' },
        },
      },
    },
  })
  getTodayReminders(@CurrentUser() user: CurrentUserPayload) {
    return this.remindersService.getTodayReminders(user.userId);
  }

  @Get('date')
  @ApiOperation({
    summary: 'Get reminder notifications for a specific date',
    description:
      'Returns formatted reminder notifications for a given date. Useful for checking future reminders.',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Date to check reminders for (defaults to today)',
    example: '2024-12-25',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of reminder notifications for the date',
  })
  getRemindersForDate(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: GetTasksByDateDto,
  ) {
    const date = query.date ? new Date(query.date) : new Date();
    return this.remindersService.getReminderNotifications(user.userId, date);
  }

  @Get('range')
  @ApiOperation({
    summary: 'Get reminder notifications for a date range',
    description:
      'Returns all reminder notifications between start and end dates. Useful for scheduling multiple push notifications.',
  })
  @ApiQuery({
    name: 'startDate',
    required: true,
    type: String,
    description: 'Start date (YYYY-MM-DD)',
    example: '2024-12-25',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    type: String,
    description: 'End date (YYYY-MM-DD)',
    example: '2024-12-31',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns array of unique reminder notifications in the range',
  })
  getRemindersForRange(
    @CurrentUser() user: CurrentUserPayload,
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
  ) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);
    return this.remindersService.getRemindersForDateRange(
      user.userId,
      startDate,
      endDate,
    );
  }
}

