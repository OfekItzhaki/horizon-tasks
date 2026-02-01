import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateTodoListCommand } from '../create-todo-list.command';
import { TodoListsService } from '../../todo-lists.service';

@CommandHandler(CreateTodoListCommand)
export class CreateTodoListHandler
  implements ICommandHandler<CreateTodoListCommand>
{
  constructor(private readonly todoListsService: TodoListsService) {}

  async execute(command: CreateTodoListCommand) {
    return this.todoListsService.create(
      command.createToDoListDto,
      command.userId,
    );
  }
}
