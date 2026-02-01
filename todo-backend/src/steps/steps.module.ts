import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { StepsController } from './steps.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CreateStepHandler } from './commands/handlers/create-step.handler';
import { UpdateStepHandler } from './commands/handlers/update-step.handler';
import { RemoveStepHandler } from './commands/handlers/remove-step.handler';
import { ReorderStepsHandler } from './commands/handlers/reorder-steps.handler';
import { GetStepsHandler } from './queries/handlers/get-steps.handler';

const CommandHandlers = [
  CreateStepHandler,
  UpdateStepHandler,
  RemoveStepHandler,
  ReorderStepsHandler,
];
const QueryHandlers = [GetStepsHandler];

@Module({
  imports: [PrismaModule, CqrsModule],
  controllers: [StepsController],
  providers: [...CommandHandlers, ...QueryHandlers],
})
export class StepsModule { }
