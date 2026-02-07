import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { SentryModule, SentryGlobalFilter } from '@sentry/nestjs/setup';
import { PrismaClientExceptionFilter } from './common/filters/prisma-exception.filter';
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
import { EventsModule } from './events/events.module';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { HealthModule } from './health/health.module';

import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    SentryModule.forRoot(),
    CqrsModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 20 },
      { name: 'long', ttl: 60000, limit: 100 },
    ]),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: config.get('REDIS_PORT'),
          password: config.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
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
    EventsModule,
    CloudinaryModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
    { provide: APP_FILTER, useClass: PrismaClientExceptionFilter },
  ],
})
export class AppModule {}
