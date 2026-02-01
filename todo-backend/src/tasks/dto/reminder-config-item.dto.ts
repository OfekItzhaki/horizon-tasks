import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const TIMEFRAME = [
  'SPECIFIC_DATE',
  'EVERY_DAY',
  'EVERY_WEEK',
  'EVERY_MONTH',
  'EVERY_YEAR',
];
const SPECIFIC_DATE_OPTIONS = [
  'START_OF_WEEK',
  'START_OF_MONTH',
  'START_OF_YEAR',
  'CUSTOM_DATE',
];

export class ReminderConfigItemDto {
  @ApiPropertyOptional({ description: 'Unique id for the reminder entry' })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({
    description: 'Reminder timeframe',
    enum: TIMEFRAME,
  })
  @IsOptional()
  @IsString()
  @IsIn(TIMEFRAME)
  timeframe?: string;

  @ApiPropertyOptional({
    description: 'Time of day (HH:mm, 24h)',
    example: '09:00',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'time must be HH:mm (e.g. 09:00)',
  })
  time?: string;

  @ApiPropertyOptional({
    description: 'Specific date option',
    enum: SPECIFIC_DATE_OPTIONS,
  })
  @IsOptional()
  @IsString()
  @IsIn(SPECIFIC_DATE_OPTIONS)
  specificDate?: string;

  @ApiPropertyOptional({ description: 'Custom date (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  customDate?: string;

  @ApiPropertyOptional({
    description: 'Day of week 0-6 (Sunday-Saturday)',
    minimum: 0,
    maximum: 6,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @ApiPropertyOptional({
    description: 'Days before due date',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  daysBefore?: number;

  @ApiPropertyOptional({ description: 'Whether alarm is enabled' })
  @IsOptional()
  @IsBoolean()
  hasAlarm?: boolean;

  @ApiPropertyOptional({ description: 'Optional location (e.g. address)' })
  @IsOptional()
  @IsString()
  location?: string;
}
