import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UpdateStepCommand } from '../update-step.command';

@CommandHandler(UpdateStepCommand)
export class UpdateStepHandler implements ICommandHandler<UpdateStepCommand> {
    constructor(private readonly prisma: PrismaService) { }

    async execute(command: UpdateStepCommand) {
        const { stepId, dto, userId } = command;

        const step = await this.prisma.step.findFirst({
            where: {
                id: stepId,
                deletedAt: null,
                task: {
                    deletedAt: null,
                    todoList: {
                        deletedAt: null,
                        OR: [
                            { ownerId: userId },
                            { shares: { some: { sharedWithId: userId } } },
                        ],
                    },
                },
            },
        });

        if (!step) {
            throw new NotFoundException(`Step with ID ${stepId} not found`);
        }

        return this.prisma.step.update({
            where: { id: stepId },
            data: {
                description: dto.description,
                completed: dto.completed,
            },
        });
    }
}
