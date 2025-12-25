import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateToDoListDto } from './dto/create-todo-list.dto';
import { UpdateToDoListDto } from './dto/update-todo-list.dto';
import { ListType } from './dto/create-todo-list.dto';

@Injectable()
export class TodoListsService {
  constructor(private prisma: PrismaService) {}

  async create(createToDoListDto: CreateToDoListDto, ownerId: number) {
    return this.prisma.toDoList.create({
      data: {
        name: createToDoListDto.name,
        type: createToDoListDto.type || ListType.CUSTOM,
        ownerId,
      },
    });
  }

  async findAll(ownerId: number) {
    return this.prisma.toDoList.findMany({
      where: {
        deletedAt: null,
        ownerId,
      },
      include: {
        tasks: {
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

    return this.prisma.toDoList.update({
      where: { id },
      data: {
        name: updateToDoListDto.name ?? list.name,
        type: updateToDoListDto.type ?? list.type,
      },
    });
  }

  async remove(id: number, ownerId: number) {
    const list = await this.findOne(id, ownerId);

    // Prevent deletion of system lists (like "Finished Tasks")
    if (list.isSystem) {
      throw new Error('System lists cannot be deleted');
    }

    return this.prisma.toDoList.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
