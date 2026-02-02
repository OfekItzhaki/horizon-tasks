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

import { TaskOccurrenceHelper } from './helpers/task-occurrence.helper';

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
        steps: { where: { deletedAt: null } },
      },
    });

    return allTasks.filter((task) => TaskOccurrenceHelper.shouldAppearOnDate(task as any, date));
  }

  async getTasksWithReminders(userId: number, date: Date = new Date()) {
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
        steps: { where: { deletedAt: null } },
      },
    });

    return allTasks.filter((task) => TaskOccurrenceHelper.shouldRemindOnDate(task as any, date));
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
