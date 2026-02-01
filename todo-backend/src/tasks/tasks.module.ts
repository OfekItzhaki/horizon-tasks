import { Module, forwardRef } from '@nestjs/common';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TaskSchedulerModule } from '../task-scheduler/task-scheduler.module';
import { CreateTaskHandler } from './commands/handlers/create-task.handler';
import { UpdateTaskHandler } from './commands/handlers/update-task.handler';
import { RemoveTaskHandler } from './commands/handlers/remove-task.handler';
import { RestoreTaskHandler } from './commands/handlers/restore-task.handler';
import { PermanentDeleteTaskHandler } from './commands/handlers/permanent-delete-task.handler';
import { GetTaskHandler } from './queries/handlers/get-task.handler';
import { GetTasksHandler } from './queries/handlers/get-tasks.handler';
import { GetTasksByDateHandler } from './queries/handlers/get-tasks-by-date.handler';
import { GetTasksWithRemindersHandler } from './queries/handlers/get-tasks-with-reminders.handler';
import { TaskAccessHelper } from './helpers/task-access.helper';

const CommandHandlers = [
  CreateTaskHandler,
  UpdateTaskHandler,
  RemoveTaskHandler,
  RestoreTaskHandler,
  PermanentDeleteTaskHandler,
];
const QueryHandlers = [
  GetTaskHandler,
  GetTasksHandler,
  GetTasksByDateHandler,
  GetTasksWithRemindersHandler,
];

@Module({
  imports: [PrismaModule, forwardRef(() => TaskSchedulerModule)],
  controllers: [TasksController],
  providers: [TasksService, TaskAccessHelper, ...CommandHandlers, ...QueryHandlers],
  exports: [TasksService],
})
export class TasksModule {}
