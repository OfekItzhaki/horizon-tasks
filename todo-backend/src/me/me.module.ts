import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { TodoListsModule } from '../todo-lists/todo-lists.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [TodoListsModule, TasksModule],
  controllers: [MeController],
})
export class MeModule {}

