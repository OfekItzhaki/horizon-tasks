import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveTodoListCommand } from '../remove-todo-list.command';
import { TodoListsService } from '../../todo-lists.service';

@CommandHandler(RemoveTodoListCommand)
export class RemoveTodoListHandler
  implements ICommandHandler<RemoveTodoListCommand>
{
  constructor(private readonly todoListsService: TodoListsService) {}

  async execute(command: RemoveTodoListCommand) {
    return this.todoListsService.remove(command.id, command.userId);
  }
}
