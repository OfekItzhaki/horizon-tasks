import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateTodoListCommand } from '../update-todo-list.command';
import { TodoListsService } from '../../todo-lists.service';

@CommandHandler(UpdateTodoListCommand)
export class UpdateTodoListHandler
  implements ICommandHandler<UpdateTodoListCommand>
{
  constructor(private readonly todoListsService: TodoListsService) {}

  async execute(command: UpdateTodoListCommand) {
    return this.todoListsService.update(
      command.id,
      command.updateToDoListDto,
      command.userId,
    );
  }
}
