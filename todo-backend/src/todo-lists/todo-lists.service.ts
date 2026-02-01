import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ListType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateToDoListDto } from './dto/create-todo-list.dto';
import { UpdateToDoListDto } from './dto/update-todo-list.dto';

@Injectable()
export class TodoListsService {
  private readonly logger = new Logger(TodoListsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createToDoListDto: CreateToDoListDto, ownerId: number) {
    const list = await this.prisma.toDoList.create({
      data: {
        name: createToDoListDto.name,
        // List "type" is an internal scheduling/system detail.
        // User-created lists are always CUSTOM.
        type: ListType.CUSTOM,
        ownerId,
      },
    });
    this.logger.log(`List created: listId=${list.id} userId=${ownerId}`);
    return list;
  }

  async findAll(ownerId: number) {
    return this.prisma.toDoList.findMany({
      where: {
        deletedAt: null,
        ownerId,
      },
      // Tasks are not needed for list view - only when viewing a specific list
      // This dramatically reduces payload size and improves performance
      orderBy: {
        order: 'asc',
      },
    });
  }

  async findOne(id: number, ownerId: number) {
    const list = await this.prisma.toDoList.findFirst({
      where: {
        id,
        ownerId,
        deletedAt: null,
      },
      include: {
        tasks: {
          where: {
            deletedAt: null,
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
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!list) {
      throw new NotFoundException(`ToDoList with ID ${id} not found`);
    }

    return list;
  }

  async update(
    id: number,
    updateToDoListDto: UpdateToDoListDto,
    ownerId: number,
  ) {
    const list = await this.findOne(id, ownerId);

    const updated = await this.prisma.toDoList.update({
      where: { id },
      data: {
        name: updateToDoListDto.name ?? list.name,
        // Type is not user-editable.
      },
    });
    this.logger.log(`List updated: listId=${id} userId=${ownerId}`);
    return updated;
  }

  async remove(id: number, ownerId: number) {
    const list = await this.findOne(id, ownerId);

    // Prevent deletion of system lists (like "Finished Tasks")
    if (list.isSystem) {
      throw new Error('System lists cannot be deleted');
    }

    const result = await this.prisma.toDoList.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
    this.logger.log(`List removed (soft): listId=${id} userId=${ownerId}`);
    return result;
  }
}
