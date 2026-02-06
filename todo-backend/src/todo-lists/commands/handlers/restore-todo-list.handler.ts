import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RestoreTodoListCommand } from '../restore-todo-list.command';
import { TodoListsService } from '../../todo-lists.service';
import { EventsService } from '../../../events/events.service';

@CommandHandler(RestoreTodoListCommand)
export class RestoreTodoListHandler implements ICommandHandler<RestoreTodoListCommand> {
    constructor(
        private readonly todoListsService: TodoListsService,
        private readonly eventsService: EventsService,
    ) { }

    async execute(command: RestoreTodoListCommand) {
        const result = await this.todoListsService.restore(command.id, command.userId);
        await this.eventsService.broadcastListEvent(command.id, 'list_restored', result);
        return result;
    }
}
