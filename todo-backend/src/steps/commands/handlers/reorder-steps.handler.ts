import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReorderStepsCommand } from '../reorder-steps.command';
import { GetStepsQuery } from '../../queries/get-steps.query';

@CommandHandler(ReorderStepsCommand)
export class ReorderStepsHandler implements ICommandHandler<ReorderStepsCommand> {
    constructor(
        private readonly prisma: PrismaService,
        private readonly queryBus: QueryBus,
    ) { }

    async execute(command: ReorderStepsCommand) {
        const { taskId, userId, stepIds } = command;

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

        const existingSteps = await this.prisma.step.findMany({
            where: {
                taskId,
                deletedAt: null,
            },
            select: {
                id: true,
            },
        });

        if (existingSteps.length !== stepIds.length) {
            throw new BadRequestException(
                'All steps must be included when reordering',
            );
        }

        // Check for duplicate step IDs
        const uniqueStepIds = new Set(stepIds);
        if (uniqueStepIds.size !== stepIds.length) {
            throw new BadRequestException(
                'Duplicate step IDs are not allowed when reordering',
            );
        }

        const validStepIds = new Set(existingSteps.map((step) => step.id));
        stepIds.forEach((id) => {
            if (!validStepIds.has(id)) {
                throw new BadRequestException(
                    `Step ID ${id} does not belong to task ${taskId}`,
                );
            }
        });

        const updates = stepIds.map((stepId, index) =>
            this.prisma.step.update({
                where: { id: stepId },
                data: { order: index + 1 },
            }),
        );

        await this.prisma.$transaction(updates);
        return this.queryBus.execute(new GetStepsQuery(taskId, userId));
    }
}
