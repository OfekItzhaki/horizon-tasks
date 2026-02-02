import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { GetStepsQuery } from '../get-steps.query';

@QueryHandler(GetStepsQuery)
export class GetStepsHandler implements IQueryHandler<GetStepsQuery> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(query: GetStepsQuery) {
        const { taskId, userId } = query;

        // Ensure access to task
        const task = await this.prisma.task.findFirst({
            where: {
                id: taskId,
                deletedAt: null,
                todoList: {
                    deletedAt: null,
                    OR: [
                        { ownerId: userId },
                        { shares: { some: { sharedWithId: userId } } },
                    ],
                },
            },
        });

        if (!task) {
            throw new NotFoundException(`Task with ID ${taskId} not found`);
        }

        return this.prisma.step.findMany({
            where: {
                taskId,
                deletedAt: null,
            },
            orderBy: {
                order: 'asc',
            },
        });
    }
}
