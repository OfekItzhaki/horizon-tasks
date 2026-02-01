import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TaskAccessHelper {
  constructor(private readonly prisma: PrismaService) {}

  async ensureListAccess(todoListId: number, userId: number) {
    const list = await this.prisma.toDoList.findFirst({
      where: {
        id: todoListId,
        deletedAt: null,
        OR: [
          { ownerId: userId },
          { shares: { some: { sharedWithId: userId } } },
        ],
      },
    });

    if (!list) {
      throw new NotFoundException(`ToDoList with ID ${todoListId} not found`);
    }

    return list;
  }

  async findTaskForUser(id: number, userId: number) {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        deletedAt: null,
        todoList: {
          deletedAt: null,
          OR: [
            { ownerId: userId },
            { shares: { some: { sharedWithId: userId } } },
          ],
        },
      },
      include: {
        steps: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
        todoList: true,
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }
}
