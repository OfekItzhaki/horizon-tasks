import {
  Injectable,
  BadRequestException,
  Inject,
  Logger,
  forwardRef,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListType, Prisma } from '@prisma/client';
import { TaskSchedulerService } from '../task-scheduler/task-scheduler.service';
import { TaskAccessHelper } from './helpers/task-access.helper';
import { ShareRole } from '@prisma/client';

import { TaskOccurrenceHelper } from './helpers/task-occurrence.helper';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    private prisma: PrismaService,
    private taskAccess: TaskAccessHelper,
    @Inject(forwardRef(() => TaskSchedulerService))
    private taskScheduler: TaskSchedulerService,
  ) {}

  async create(
    todoListId: string,
    createTaskDto: CreateTaskDto,
    ownerId: string,
  ) {
    await this.taskAccess.ensureListAccess(
      todoListId,
      ownerId,
      ShareRole.EDITOR,
    );

    const task = await this.prisma.task.create({
      data: {
        description: createTaskDto.description,
        dueDate: createTaskDto.dueDate,
        specificDayOfWeek: createTaskDto.specificDayOfWeek,
        reminderDaysBefore: createTaskDto.reminderDaysBefore ?? [],
        reminderConfig: createTaskDto.reminderConfig
          ? (JSON.parse(
              JSON.stringify(createTaskDto.reminderConfig),
            ) as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        completed: createTaskDto.completed ?? false,
        todoListId,
      },
    });
    this.logger.log(
      `Task created: taskId=${task.id} todoListId=${todoListId} userId=${ownerId}`,
    );
    return task;
  }

  async findAll(userId: string, todoListId?: string) {
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

  async findOne(id: string, userId: string) {
    return this.taskAccess.findTaskForUser(id, userId);
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string) {
    const task = await this.taskAccess.findTaskForUser(
      id,
      userId,
      ShareRole.EDITOR,
    );

    // Track completedAt timestamp
    let completedAt: Date | null | undefined = undefined;
    if (updateTaskDto.completed !== undefined) {
      if (updateTaskDto.completed && !task.completed) {
        // Task is being marked as completed
        completedAt = new Date();
      } else if (!updateTaskDto.completed && task.completed) {
        // Task is being unmarked as completed
        completedAt = null;
      }
    }

    // Reset completionCount if task has weekly reminder (specificDayOfWeek)
    // completionCount should only be tracked for daily tasks, not weekly ones
    const finalSpecificDayOfWeek =
      updateTaskDto.specificDayOfWeek !== undefined
        ? updateTaskDto.specificDayOfWeek
        : task.specificDayOfWeek;

    const shouldResetCompletionCount =
      finalSpecificDayOfWeek !== null &&
      finalSpecificDayOfWeek !== undefined &&
      task.completionCount > 0;

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        description: updateTaskDto.description,
        dueDate: updateTaskDto.dueDate,
        specificDayOfWeek: updateTaskDto.specificDayOfWeek,
        reminderDaysBefore: updateTaskDto.reminderDaysBefore,
        reminderConfig:
          updateTaskDto.reminderConfig !== undefined
            ? (JSON.parse(
                JSON.stringify(updateTaskDto.reminderConfig),
              ) as Prisma.InputJsonValue)
            : undefined,
        completed: updateTaskDto.completed,
        ...(completedAt !== undefined && { completedAt }),
        ...(shouldResetCompletionCount && { completionCount: 0 }),
      },
    });
    this.logger.log(`Task updated: taskId=${id} userId=${userId}`);
    return updated;
  }

  async remove(id: string, userId: string) {
    await this.taskAccess.findTaskForUser(id, userId, ShareRole.EDITOR);

    const result = await this.prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    this.logger.log(`Task removed (soft): taskId=${id} userId=${userId}`);
    return result;
  }

  async getTasksByDate(userId: string, date: Date = new Date()) {
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

    return allTasks.filter((task) =>
      TaskOccurrenceHelper.shouldAppearOnDate(task, date),
    );
  }

  async getTasksWithReminders(userId: string, date: Date = new Date()) {
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

    return allTasks.filter((task) =>
      TaskOccurrenceHelper.shouldRemindOnDate(task, date),
    );
  }

  /**
   * Restore an archived task back to its original list
   */
  async restore(id: string, ownerId: string) {
    // Look for task (including deleted ones)
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        todoList: {
          OR: [{ ownerId }, { shares: { some: { sharedWithId: ownerId } } }],
        },
      },
      include: { todoList: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Case 1: Task was soft-deleted
    if (task.deletedAt) {
      const restored = await this.prisma.task.update({
        where: { id },
        data: { deletedAt: null },
        include: {
          steps: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
          todoList: true,
        },
      });
      this.logger.log(`Task undeleted: taskId=${id} userId=${ownerId}`);
      return restored;
    }

    // Case 2: Task was archived (completed in a system list)
    if (task.todoList.type === ListType.FINISHED) {
      if (!task.originalListId) {
        throw new BadRequestException(
          'Original list information not available',
        );
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

      const restored = await this.prisma.task.update({
        where: { id },
        data: {
          todoListId: task.originalListId,
          originalListId: null,
          completed: false,
          completedAt: null,
        },
        include: {
          steps: { where: { deletedAt: null }, orderBy: { order: 'asc' } },
          todoList: true,
        },
      });
      this.logger.log(`Task unarchived: taskId=${id} userId=${ownerId}`);
      return restored;
    }

    throw new BadRequestException('Task is neither deleted nor archived');
  }

  async permanentDelete(id: string, ownerId: string) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        todoList: {
          OR: [{ ownerId }, { shares: { some: { sharedWithId: ownerId } } }],
        },
      },
      include: { todoList: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    if (!task.deletedAt && task.todoList.type !== ListType.FINISHED) {
      throw new BadRequestException(
        'Only deleted or archived tasks can be permanently deleted.',
      );
    }

    await this.prisma.step.deleteMany({ where: { taskId: id } });
    await this.prisma.task.delete({ where: { id } });

    this.logger.log(`Task permanently deleted: taskId=${id} userId=${ownerId}`);
    return { message: 'Task permanently deleted' };
  }
}
