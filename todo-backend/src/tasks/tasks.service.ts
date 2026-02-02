import {
  Injectable,
  BadRequestException,
  Inject,
  Logger,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListType, Prisma } from '@prisma/client';
import { TaskSchedulerService } from '../task-scheduler/task-scheduler.service';
import { TaskAccessHelper } from './helpers/task-access.helper';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private taskAccess: TaskAccessHelper,
    @Inject(forwardRef(() => TaskSchedulerService))
    private taskScheduler: TaskSchedulerService,
  ) { }

  async create(
    todoListId: number,
    createTaskDto: CreateTaskDto,
    ownerId: number,
  ) {
    await this.taskAccess.ensureListAccess(todoListId, ownerId);

    const task = await this.prisma.task.create({
      data: {
        description: createTaskDto.description,
        dueDate: createTaskDto.dueDate,
        specificDayOfWeek: createTaskDto.specificDayOfWeek,
        reminderDaysBefore: createTaskDto.reminderDaysBefore ?? [],
        reminderConfig: createTaskDto.reminderConfig
          ? JSON.parse(JSON.stringify(createTaskDto.reminderConfig))
          : undefined,
        completed: createTaskDto.completed ?? false,
        todoListId,
      },
    });
    this.logger.log(
      `Task created: taskId=${task.id} todoListId=${todoListId} userId=${ownerId}`,
    );
    return task;
  }

  async findAll(userId: number, todoListId?: number) {
    // If loading from a daily list, check if tasks need to be reset
    if (todoListId) {
      const list = await this.prisma.toDoList.findFirst({
        where: { id: todoListId, deletedAt: null },
      });
      if (list?.type === ListType.DAILY) {
        // Check and reset daily tasks if needed (in case cron didn't run)
        await this.taskScheduler.checkAndResetDailyTasksIfNeeded();
      }
    }

    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      todoList: {
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { shares: { some: { sharedWithId: userId } } },
        ],
      },
    };

    if (todoListId) {
      where.todoListId = todoListId;
    }

    return this.prisma.task.findMany({
      where,
      include: {
        steps: {
          where: {
            deletedAt: null,
          },
          orderBy: {
            order: 'asc',
          },
        },
        todoList: true,
      },
      orderBy: {
        order: 'asc',
      },
    });
  }

  async findOne(id: number, ownerId: number) {
    return this.taskAccess.findTaskForUser(id, ownerId);
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, ownerId: number) {
    const existingTask = await this.taskAccess.findTaskForUser(id, ownerId);

    // Track completedAt timestamp
    let completedAt: Date | null | undefined = undefined;
    if (updateTaskDto.completed !== undefined) {
      if (updateTaskDto.completed && !existingTask.completed) {
        // Task is being marked as completed
        completedAt = new Date();
      } else if (!updateTaskDto.completed && existingTask.completed) {
        // Task is being unmarked as completed
        completedAt = null;
      }
    }

    // Reset completionCount if task has weekly reminder (specificDayOfWeek)
    // completionCount should only be tracked for daily tasks, not weekly ones
    const finalSpecificDayOfWeek = updateTaskDto.specificDayOfWeek !== undefined
      ? updateTaskDto.specificDayOfWeek
      : existingTask.specificDayOfWeek;

    const shouldResetCompletionCount = finalSpecificDayOfWeek !== null &&
      finalSpecificDayOfWeek !== undefined &&
      existingTask.completionCount > 0;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        description: updateTaskDto.description,
        dueDate: updateTaskDto.dueDate,
        specificDayOfWeek: updateTaskDto.specificDayOfWeek,
        reminderDaysBefore: updateTaskDto.reminderDaysBefore,
        reminderConfig:
          updateTaskDto.reminderConfig !== undefined
            ? JSON.parse(JSON.stringify(updateTaskDto.reminderConfig))
            : undefined,
        completed: updateTaskDto.completed,
        ...(completedAt !== undefined && { completedAt }),
        ...(shouldResetCompletionCount && { completionCount: 0 }),
      },
    });
    this.logger.log(`Task updated: taskId=${id} userId=${ownerId}`);
    return updated;
  }

  async remove(id: number, ownerId: number) {
    await this.taskAccess.findTaskForUser(id, ownerId);

    const result = await this.prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    this.logger.log(`Task removed (soft): taskId=${id} userId=${ownerId}`);
    return result;
  }

  async getTasksByDate(userId: number, date: Date = new Date()) {
    // Normalize date to start of day
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Get all tasks from owned and shared lists
    const allTasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        completed: false,
        todoList: {
          deletedAt: null,
          OR: [
            { ownerId: userId },
            { shares: { some: { sharedWithId: userId } } },
          ],
        },
      },
      include: {
        todoList: true,
        steps: {
          where: {
            deletedAt: null,
          },
        },
      },
    });

    // Filter tasks that should appear on this date
    const tasksForDate = allTasks.filter((task) => {
      const list = task.todoList;

      // If task has a specific due date, check if it matches
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === targetDate.getTime();
      }

      // If task has a specific day of week, check if today matches
      if (task.specificDayOfWeek !== null) {
        const dayOfWeek = targetDate.getDay();
        if (dayOfWeek === task.specificDayOfWeek) {
          return true;
        }
      }

      // For list-based scheduling
      switch (list.type) {
        case ListType.DAILY:
          return true; // Daily tasks appear every day

        case ListType.WEEKLY:
          // If no specific day, check if it's the first day of the week (Sunday)
          if (task.specificDayOfWeek === null) {
            return targetDate.getDay() === 0; // Sunday
          }
          return targetDate.getDay() === task.specificDayOfWeek;

        case ListType.MONTHLY:
          // If no specific day, check if it's the first day of the month
          if (task.specificDayOfWeek === null && !task.dueDate) {
            return targetDate.getDate() === 1;
          }
          // If has specific day of week, check if it's that day in the current month
          if (task.specificDayOfWeek !== null) {
            return targetDate.getDay() === task.specificDayOfWeek;
          }
          return false;

        case ListType.YEARLY:
          // If no specific date, check if it's January 1st
          if (task.specificDayOfWeek === null && !task.dueDate) {
            return targetDate.getMonth() === 0 && targetDate.getDate() === 1;
          }
          // If has specific day of week, check if it's that day
          if (task.specificDayOfWeek !== null) {
            return targetDate.getDay() === task.specificDayOfWeek;
          }
          return false;

        case ListType.CUSTOM:
        default:
          // Custom lists: only show if there's a due date or specific day
          if (task.dueDate) {
            const dueDate = new Date(task.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === targetDate.getTime();
          }
          if (task.specificDayOfWeek !== null) {
            return targetDate.getDay() === task.specificDayOfWeek;
          }
          return false;
      }
    });

    return tasksForDate;
  }

  async getTasksWithReminders(userId: number, date: Date = new Date()) {
    // Get all tasks that have reminders set for this date
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const allTasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        completed: false,
        todoList: {
          deletedAt: null,
          OR: [
            { ownerId: userId },
            { shares: { some: { sharedWithId: userId } } },
          ],
        },
      },
      include: {
        todoList: true,
        steps: {
          where: {
            deletedAt: null,
          },
        },
      },
    });

    const tasksWithReminders = allTasks.filter((task) => {
      // Support both old single value and new array format for backward compatibility
      const reminderDaysArray = Array.isArray(task.reminderDaysBefore)
        ? task.reminderDaysBefore
        : task.reminderDaysBefore
          ? [task.reminderDaysBefore]
          : [1];

      // Calculate when the task is due
      let taskDueDate: Date | null = null;

      if (task.dueDate) {
        taskDueDate = new Date(task.dueDate);
        taskDueDate.setHours(0, 0, 0, 0);
      } else if (task.specificDayOfWeek !== null) {
        // Find next occurrence of this day of week
        const daysUntil =
          (task.specificDayOfWeek - targetDate.getDay() + 7) % 7;
        taskDueDate = new Date(targetDate);
        taskDueDate.setDate(taskDueDate.getDate() + (daysUntil || 7));
        taskDueDate.setHours(0, 0, 0, 0);
      } else {
        // For list-based tasks, calculate based on list type
        const list = task.todoList;
        switch (list.type) {
          case ListType.WEEKLY: {
            // Next Sunday (start of week)
            const daysUntilSunday = (7 - targetDate.getDay()) % 7 || 7;
            taskDueDate = new Date(targetDate);
            taskDueDate.setDate(taskDueDate.getDate() + daysUntilSunday);
            taskDueDate.setHours(0, 0, 0, 0);
            break;
          }
          case ListType.MONTHLY: {
            // First day of next month
            taskDueDate = new Date(
              targetDate.getFullYear(),
              targetDate.getMonth() + 1,
              1,
            );
            taskDueDate.setHours(0, 0, 0, 0);
            break;
          }
          case ListType.YEARLY: {
            // January 1st of next year
            taskDueDate = new Date(targetDate.getFullYear() + 1, 0, 1);
            taskDueDate.setHours(0, 0, 0, 0);
            break;
          }
          default:
            return false;
        }
      }

      if (!taskDueDate) {
        return false;
      }

      // Check if any reminder date matches target date
      return reminderDaysArray.some((reminderDays) => {
        const reminderTargetDate = new Date(taskDueDate);
        reminderTargetDate.setDate(reminderTargetDate.getDate() - reminderDays);
        reminderTargetDate.setHours(0, 0, 0, 0);
        return reminderTargetDate.getTime() === targetDate.getTime();
      });
    });

    return tasksWithReminders;
  }

  /**
   * Restore an archived task back to its original list
   */
  async restore(id: number, ownerId: number) {
    const task = await this.taskAccess.findTaskForUser(id, ownerId);

    // Check if task is in a FINISHED list
    if (task.todoList.type !== ListType.FINISHED) {
      throw new BadRequestException('Only archived tasks can be restored');
    }

    // Check if original list still exists
    if (!task.originalListId) {
      throw new BadRequestException('Original list information not available');
    }

    const originalList = await this.prisma.toDoList.findFirst({
      where: {
        id: task.originalListId,
        ownerId,
        deletedAt: null,
      },
    });

    if (!originalList) {
      throw new BadRequestException('Original list no longer exists');
    }

    // Restore task to original list
    const restored = await this.prisma.task.update({
      where: { id },
      data: {
        todoListId: task.originalListId,
        originalListId: null,
        completed: false,
        completedAt: null,
      },
      include: {
        steps: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
        todoList: true,
      },
    });
    this.logger.log(
      `Task restored: taskId=${id} originalListId=${task.originalListId} userId=${ownerId}`,
    );
    return restored;
  }

  /**
   * Permanently delete an archived task (hard delete)
   */
  async permanentDelete(id: number, ownerId: number) {
    const task = await this.taskAccess.findTaskForUser(id, ownerId);

    // Only allow permanent deletion of archived tasks
    if (task.todoList.type !== ListType.FINISHED) {
      throw new BadRequestException(
        'Only archived tasks can be permanently deleted. Use regular delete for active tasks.',
      );
    }

    // Delete all steps first
    await this.prisma.step.deleteMany({
      where: { taskId: id },
    });

    // Then delete the task
    await this.prisma.task.delete({
      where: { id },
    });

    this.logger.log(`Task permanently deleted: taskId=${id} userId=${ownerId}`);
    return { message: 'Task permanently deleted' };
  }
}
