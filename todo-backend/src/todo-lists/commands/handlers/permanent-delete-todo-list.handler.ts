import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PermanentDeleteTodoListCommand } from '../permanent-delete-todo-list.command';
import { TodoListsService } from '../../todo-lists.service';
import { EventsService } from '../../../events/events.service';

@CommandHandler(PermanentDeleteTodoListCommand)
export class PermanentDeleteTodoListHandler implements ICommandHandler<PermanentDeleteTodoListCommand> {
    constructor(
        private readonly todoListsService: TodoListsService,
        private readonly eventsService: EventsService,
    ) { }

    async execute(command: PermanentDeleteTodoListCommand) {
        const result = await this.todoListsService.permanentDelete(command.id, command.userId);
        // Notify about permanent deletion (useful for multi-device sync)
        await this.eventsService.broadcastListEvent(command.id, 'list_permanently_deleted', { id: command.id });
        return result;
    }
}
