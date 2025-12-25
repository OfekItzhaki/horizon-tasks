import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ListType } from '@prisma/client';

@Injectable()
export class TaskSchedulerService {
  private readonly logger = new Logger(TaskSchedulerService.name);
  
  // Archive delay in minutes - how long to wait after task completion before moving to Finished list
  private readonly ARCHIVE_DELAY_MINUTES = 5;
  
  // System list name for finished tasks
  private readonly FINISHED_LIST_NAME = 'Finished Tasks';

  constructor(private prisma: PrismaService) {}

  /**
   * Get or create the system "Finished Tasks" list for a user
   */
  private async getOrCreateFinishedList(ownerId: number) {
    // Try to find existing finished list
    let finishedList = await this.prisma.toDoList.findFirst({
      where: {
        ownerId,
        type: ListType.FINISHED,
        isSystem: true,
        deletedAt: null,
      },
    });

    // Create if not exists
    if (!finishedList) {
      finishedList = await this.prisma.toDoList.create({
        data: {
          name: this.FINISHED_LIST_NAME,
          type: ListType.FINISHED,
          isSystem: true,
          ownerId,
        },
      });
      this.logger.log(`Created Finished Tasks list for user ${ownerId}`);
    }

    return finishedList;
  }

  /**
   * Runs every 5 minutes to check for completed tasks that need to be archived
   * (moved from CUSTOM lists to the Finished Tasks list)
   * Note: Using 5-minute interval to reduce database load while still being timely
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async archiveCompletedTasks() {
    const archiveThreshold = new Date();
    archiveThreshold.setMinutes(archiveThreshold.getMinutes() - this.ARCHIVE_DELAY_MINUTES);

    // Find all completed tasks in CUSTOM lists that have been completed for more than ARCHIVE_DELAY_MINUTES
    const tasksToArchive = await this.prisma.task.findMany({
      where: {
        completed: true,
        completedAt: {
          lte: archiveThreshold,
        },
        deletedAt: null,
        todoList: {
          type: ListType.CUSTOM,
          deletedAt: null,
        },
      },
      include: {
        todoList: true,
      },
    });

    if (tasksToArchive.length === 0) {
      return;
    }

    this.logger.log(`Found ${tasksToArchive.length} tasks to archive`);

    // Group tasks by owner
    const tasksByOwner = tasksToArchive.reduce((acc, task) => {
      const ownerId = task.todoList.ownerId;
      if (!acc[ownerId]) {
        acc[ownerId] = [];
      }
      acc[ownerId].push(task);
      return acc;
    }, {} as Record<number, typeof tasksToArchive>);

    // Move tasks to their owner's Finished list
    for (const [ownerId, tasks] of Object.entries(tasksByOwner)) {
      const finishedList = await this.getOrCreateFinishedList(Number(ownerId));
      
      // Update each task individually to preserve originalListId
      for (const task of tasks) {
        await this.prisma.task.update({
          where: { id: task.id },
          data: {
            todoListId: finishedList.id,
            originalListId: task.todoListId, // Remember where it came from for restore
          },
        });
      }

      this.logger.log(`Archived ${tasks.length} tasks for user ${ownerId}`);
    }
  }

  /**
   * Runs at midnight every day to reset DAILY tasks
   */
  @Cron('0 0 * * *') // Every day at midnight
  async resetDailyTasks() {
    // First, increment completion count for all completed daily tasks
    await this.prisma.$executeRaw`
      UPDATE "Task" 
      SET "completionCount" = "completionCount" + 1
      WHERE "completed" = true 
      AND "deletedAt" IS NULL
      AND "todoListId" IN (
        SELECT "id" FROM "ToDoList" 
        WHERE "type" = 'DAILY' AND "deletedAt" IS NULL
      )
    `;

    const result = await this.prisma.task.updateMany({
      where: {
        completed: true,
        deletedAt: null,
        todoList: {
          type: ListType.DAILY,
          deletedAt: null,
        },
      },
      data: {
        completed: false,
        completedAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Reset ${result.count} daily tasks (completion counts incremented)`);
    }

    // Also reset steps for these tasks
    await this.prisma.step.updateMany({
      where: {
        completed: true,
        deletedAt: null,
        task: {
          deletedAt: null,
          todoList: {
            type: ListType.DAILY,
            deletedAt: null,
          },
        },
      },
      data: {
        completed: false,
      },
    });
  }

  /**
   * Runs at midnight on Monday to reset WEEKLY tasks
   */
  @Cron('0 0 * * 1') // Every Monday at midnight
  async resetWeeklyTasks() {
    // First, increment completion count for all completed weekly tasks
    await this.prisma.$executeRaw`
      UPDATE "Task" 
      SET "completionCount" = "completionCount" + 1
      WHERE "completed" = true 
      AND "deletedAt" IS NULL
      AND "todoListId" IN (
        SELECT "id" FROM "ToDoList" 
        WHERE "type" = 'WEEKLY' AND "deletedAt" IS NULL
      )
    `;

    const result = await this.prisma.task.updateMany({
      where: {
        completed: true,
        deletedAt: null,
        todoList: {
          type: ListType.WEEKLY,
          deletedAt: null,
        },
      },
      data: {
        completed: false,
        completedAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Reset ${result.count} weekly tasks (completion counts incremented)`);
    }

    // Also reset steps for these tasks
    await this.prisma.step.updateMany({
      where: {
        completed: true,
        deletedAt: null,
        task: {
          deletedAt: null,
          todoList: {
            type: ListType.WEEKLY,
            deletedAt: null,
          },
        },
      },
      data: {
        completed: false,
      },
    });
  }

  /**
   * Runs at midnight on the 1st of each month to reset MONTHLY tasks
   */
  @Cron('0 0 1 * *') // 1st of every month at midnight
  async resetMonthlyTasks() {
    // First, increment completion count for all completed monthly tasks
    await this.prisma.$executeRaw`
      UPDATE "Task" 
      SET "completionCount" = "completionCount" + 1
      WHERE "completed" = true 
      AND "deletedAt" IS NULL
      AND "todoListId" IN (
        SELECT "id" FROM "ToDoList" 
        WHERE "type" = 'MONTHLY' AND "deletedAt" IS NULL
      )
    `;

    const result = await this.prisma.task.updateMany({
      where: {
        completed: true,
        deletedAt: null,
        todoList: {
          type: ListType.MONTHLY,
          deletedAt: null,
        },
      },
      data: {
        completed: false,
        completedAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Reset ${result.count} monthly tasks (completion counts incremented)`);
    }

    // Also reset steps for these tasks
    await this.prisma.step.updateMany({
      where: {
        completed: true,
        deletedAt: null,
        task: {
          deletedAt: null,
          todoList: {
            type: ListType.MONTHLY,
            deletedAt: null,
          },
        },
      },
      data: {
        completed: false,
      },
    });
  }

  /**
   * Runs at midnight on January 1st to reset YEARLY tasks
   */
  @Cron('0 0 1 1 *') // January 1st at midnight
  async resetYearlyTasks() {
    // First, increment completion count for all completed yearly tasks
    await this.prisma.$executeRaw`
      UPDATE "Task" 
      SET "completionCount" = "completionCount" + 1
      WHERE "completed" = true 
      AND "deletedAt" IS NULL
      AND "todoListId" IN (
        SELECT "id" FROM "ToDoList" 
        WHERE "type" = 'YEARLY' AND "deletedAt" IS NULL
      )
    `;

    const result = await this.prisma.task.updateMany({
      where: {
        completed: true,
        deletedAt: null,
        todoList: {
          type: ListType.YEARLY,
          deletedAt: null,
        },
      },
      data: {
        completed: false,
        completedAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Reset ${result.count} yearly tasks (completion counts incremented)`);
    }

    // Also reset steps for these tasks
    await this.prisma.step.updateMany({
      where: {
        completed: true,
        deletedAt: null,
        task: {
          deletedAt: null,
          todoList: {
            type: ListType.YEARLY,
            deletedAt: null,
          },
        },
      },
      data: {
        completed: false,
      },
    });
  }
}
