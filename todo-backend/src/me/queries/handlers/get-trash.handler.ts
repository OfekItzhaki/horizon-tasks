import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTrashQuery } from '../get-trash.query';
import { PrismaService } from '../../../prisma/prisma.service';

@QueryHandler(GetTrashQuery)
export class GetTrashHandler implements IQueryHandler<GetTrashQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetTrashQuery) {
        const { userId } = query;

        const [deletedLists, deletedTasks] = await Promise.all([
            this.prisma.toDoList.findMany({
                where: {
                    ownerId: userId,
                    deletedAt: { not: null },
                },
                include: {
                    _count: {
                        select: { tasks: true },
                    },
                },
                orderBy: { deletedAt: 'desc' },
            }),
            this.prisma.task.findMany({
                where: {
                    todoList: { ownerId: userId },
                    deletedAt: { not: null },
                },
                include: {
                    todoList: true,
                },
                orderBy: { deletedAt: 'desc' },
            }),
        ]);

        return {
            lists: deletedLists,
            tasks: deletedTasks,
        };
    }
}
