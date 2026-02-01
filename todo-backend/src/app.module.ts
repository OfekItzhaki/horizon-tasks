import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
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
import { EmailModule } from './email/email.module';

function validateEnv(config: Record<string, unknown>) {
  const required = ['DATABASE_URL'];
  const missing = required.filter((key) => !config[key] || String(config[key]).trim() === '');
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  return config;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    SentryModule.forRoot(),
    CqrsModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    EmailModule,
    UsersModule,
    AuthModule,
    TodoListsModule,
    TasksModule,
    StepsModule,
    ListSharesModule,
    MeModule,
    RemindersModule,
    TaskSchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
  ],
})
export class AppModule {}
