import {
  IsArray,
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReminderConfigItemDto } from './reminder-config-item.dto';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'Task description',
    example: 'Updated task description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Due date for the task. Set to null to clear.',
    example: '2024-12-31T23:59:59Z',
    type: String,
    format: 'date-time',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o: UpdateTaskDto) => o.dueDate !== null)
  @IsDate()
  @Type(() => Date)
  dueDate?: Date | null;

  @ApiPropertyOptional({
    description:
      'Specific day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday). Set to null to clear.',
    example: 1,
    minimum: 0,
    maximum: 6,
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((o: UpdateTaskDto) => o.specificDayOfWeek !== null)
  @IsInt()
  @Min(0)
  @Max(6)
  specificDayOfWeek?: number | null;

  @ApiPropertyOptional({
    description:
      'Array of days before due date to send reminders. Can specify multiple reminders (e.g., [7, 1] for 7 days and 1 day before)',
    example: [7, 1],
    type: [Number],
  })
  @IsOptional()
  @IsInt({ each: true })
  @Min(0, { each: true })
  reminderDaysBefore?: number[];

  @ApiPropertyOptional({
    description: 'Reminder configurations (every day, week, etc.)',
    type: [ReminderConfigItemDto],
    example: [{ timeframe: 'EVERY_DAY', time: '09:00', hasAlarm: true }],
  })
  @IsOptional()
  @ValidateIf((o: UpdateTaskDto) => o.reminderConfig !== null)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReminderConfigItemDto)
  reminderConfig?: ReminderConfigItemDto[] | null;

  @ApiPropertyOptional({
    description: 'Whether the task is completed',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional({
    description: 'Order/position of the task in the list',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  order?: number;
}
