import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
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
import { TaskSchedulerModule } from './task-scheduler/task-scheduler.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    TodoListsModule,
    TasksModule,
    StepsModule,
    ListSharesModule,
    MeModule,
    RemindersModule,
<<<<<<< HEAD
    TaskSchedulerModule,
=======
>>>>>>> main
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
