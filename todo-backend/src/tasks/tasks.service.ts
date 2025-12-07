import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ListType } from '../todo-lists/dto/create-todo-list.dto';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  private async ensureListAccess(todoListId: number, ownerId: number) {
    await this.prisma.toDoList.findFirstOrThrow({
      where: {
        id: todoListId,
        ownerId,
        deletedAt: null,
      },
    });
  }

  private async findTaskForUser(id: number, ownerId: number) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        todoList: {
          ownerId,
          deletedAt: null,
        },
      },
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
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async create(
    todoListId: number,
    createTaskDto: CreateTaskDto,
    ownerId: number,
  ) {
    await this.ensureListAccess(todoListId, ownerId);

    return this.prisma.task.create({
      data: {
        description: createTaskDto.description,
        dueDate: createTaskDto.dueDate,
        specificDayOfWeek: createTaskDto.specificDayOfWeek,
        reminderDaysBefore:
          createTaskDto.reminderDaysBefore ?? [1],
        completed: createTaskDto.completed ?? false,
        todoListId,
      },
    });
  }

  async findAll(ownerId: number, todoListId?: number) {
    const where: any = {
      deletedAt: null,
      todoList: {
        ownerId,
        deletedAt: null,
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
    return this.findTaskForUser(id, ownerId);
  }

  async update(id: number, updateTaskDto: UpdateTaskDto, ownerId: number) {
    await this.findTaskForUser(id, ownerId);

    return this.prisma.task.update({
      where: { id },
      data: {
        description: updateTaskDto.description,
        dueDate: updateTaskDto.dueDate,
        specificDayOfWeek: updateTaskDto.specificDayOfWeek,
        reminderDaysBefore: updateTaskDto.reminderDaysBefore,
        completed: updateTaskDto.completed,
      },
    });
  }

  async remove(id: number, ownerId: number) {
    await this.findTaskForUser(id, ownerId);

    return this.prisma.task.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getTasksByDate(ownerId: number, date: Date = new Date()) {
    // Normalize date to start of day
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // Get all tasks from all lists
    const allTasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        completed: false,
        todoList: {
          ownerId,
          deletedAt: null,
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

  async getTasksWithReminders(ownerId: number, date: Date = new Date()) {
    // Get all tasks that have reminders set for this date
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const allTasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        completed: false,
        todoList: {
          ownerId,
          deletedAt: null,
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
          case ListType.WEEKLY:
            // Next Sunday (start of week)
            const daysUntilSunday = (7 - targetDate.getDay()) % 7 || 7;
            taskDueDate = new Date(targetDate);
            taskDueDate.setDate(taskDueDate.getDate() + daysUntilSunday);
            taskDueDate.setHours(0, 0, 0, 0);
            break;
          case ListType.MONTHLY:
            // First day of next month
            taskDueDate = new Date(
              targetDate.getFullYear(),
              targetDate.getMonth() + 1,
              1,
            );
            taskDueDate.setHours(0, 0, 0, 0);
            break;
          case ListType.YEARLY:
            // January 1st of next year
            taskDueDate = new Date(targetDate.getFullYear() + 1, 0, 1);
            taskDueDate.setHours(0, 0, 0, 0);
            break;
          default:
            return false;
        }
      }

      if (!taskDueDate) {
        return false;
      }

      // Check if any reminder date matches target date
      return reminderDaysArray.some((reminderDays) => {
        const reminderTargetDate = new Date(taskDueDate!);
        reminderTargetDate.setDate(
          reminderTargetDate.getDate() - reminderDays,
        );
        reminderTargetDate.setHours(0, 0, 0, 0);
        return reminderTargetDate.getTime() === targetDate.getTime();
      });
    });

    return tasksWithReminders;
  }
}
