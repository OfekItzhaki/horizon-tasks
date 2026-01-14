import {
  IsBoolean,
  IsDate,
  IsInt,
  IsOptional,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'Task description',
    example: 'Updated task description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Due date for the task',
    example: '2024-12-31T23:59:59Z',
    type: String,
    format: 'date-time',
  })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dueDate?: Date;

  @ApiPropertyOptional({
    description:
      'Specific day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  specificDayOfWeek?: number;

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
