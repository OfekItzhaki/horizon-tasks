import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ListType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM',
  FINISHED = 'FINISHED', // System list for archived completed tasks
}

export class CreateToDoListDto {
  @ApiProperty({
    description: 'Name of the to-do list',
    example: 'My Daily Tasks',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Type of the list',
    enum: ListType,
    default: ListType.CUSTOM,
    example: ListType.DAILY,
  })
  @IsEnum(ListType)
  @IsOptional()
  type?: ListType;
}
