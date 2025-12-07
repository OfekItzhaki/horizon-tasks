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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({
    description: 'Task description',
    example: 'Complete project documentation',
  })
  @IsString()
  description: string;

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
    description: 'Specific day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)',
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
    default: [1],
  })
  @IsOptional()
  @IsInt({ each: true })
  @Min(0, { each: true })
  reminderDaysBefore?: number[];

  @ApiPropertyOptional({
    description: 'Whether the task is completed',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  completed?: boolean;
}
