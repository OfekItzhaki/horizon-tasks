import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PermanentDeleteTaskCommand } from '../permanent-delete-task.command';
import { TasksService } from '../../tasks.service';

@CommandHandler(PermanentDeleteTaskCommand)
export class PermanentDeleteTaskHandler
  implements ICommandHandler<PermanentDeleteTaskCommand>
{
  constructor(private readonly tasksService: TasksService) {}

  async execute(command: PermanentDeleteTaskCommand) {
    return this.tasksService.permanentDelete(command.id, command.userId);
  }
}
