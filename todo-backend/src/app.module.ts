import { Module } from '@nestjs/common';
import AppService from './app.service';
import AppController from './app.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { TodoListsModule } from './todo-lists/todo-lists.module';
import { TasksModule } from './tasks/tasks.module';
import { StepsModule } from './steps/steps.module';
import { ListSharesModule } from './list-shares/list-shares.module';
import { MeModule } from './me/me.module';
import { RemindersModule } from './reminders/reminders.module';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    AuthModule,
    TodoListsModule,
    TasksModule,
    StepsModule,
    ListSharesModule,
    MeModule,
    RemindersModule,
import { StepsController } from './steps/steps.controller';
import { StepsService } from './steps/steps.service';
import { MeController } from './me/me.controller';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule],
  controllers: [
    AppController,
    TodoListsController,
    TasksController,
    ListSharesController,
    StepsController,
    MeController,
  ],
  providers: [
    AppService,
    TodoListsService,
    TasksService,
    ListSharesService,
    StepsService,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
