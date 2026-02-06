import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
    private readonly logger = new Logger(EventsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventsGateway: EventsGateway,
    ) { }

    async broadcastTaskEvent(taskId: string, event: string, data: any) {
        try {
            // Find the task and its list to identify all associated users
            const task = await (this.prisma.task as any).findUnique({
                where: { id: taskId },
                include: {
                    todoList: {
                        include: {
                            shares: {
                                select: { sharedWithId: true }
                            }
                        }
                    }
                }
            });

            if (!task || !task.todoList) return;

            this.notifyListUsers(task.todoList, event, data);
        } catch (error) {
            this.logger.error(`Failed to broadcast task event: ${error.message}`);
        }
    }

    async broadcastListEvent(listId: string, event: string, data: any) {
        try {
            const list = await (this.prisma.toDoList as any).findUnique({
                where: { id: listId },
                include: {
                    shares: {
                        select: { sharedWithId: true }
                    }
                }
            });

            if (!list) return;

            this.notifyListUsers(list, event, data);
        } catch (error) {
            this.logger.error(`Failed to broadcast list event: ${error.message}`);
        }
    }

    async broadcastStepEvent(taskId: string, event: string, data: any) {
        // For steps, we still need to find the task's users
        return this.broadcastTaskEvent(taskId, event, data);
    }

    private notifyListUsers(list: any, event: string, data: any) {
        const userIds = new Set<string>();

        // Add owner
        if (list.ownerId) userIds.add(list.ownerId);

        // Add shared users
        if (list.shares) {
            list.shares.forEach((share: any) => userIds.add(share.sharedWithId));
        }

        // Send to all
        userIds.forEach(userId => {
            this.eventsGateway.sendToUser(userId, event, data);
        });
    }
}
