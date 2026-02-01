import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RemoveTaskCommand } from '../remove-task.command';
import { TasksService } from '../../tasks.service';

@CommandHandler(RemoveTaskCommand)
export class RemoveTaskHandler implements ICommandHandler<RemoveTaskCommand> {
  constructor(private readonly tasksService: TasksService) {}

  async execute(command: RemoveTaskCommand) {
    return this.tasksService.remove(command.id, command.userId);
  }
}
