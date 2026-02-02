import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RestoreTaskCommand } from '../restore-task.command';
import { TasksService } from '../../tasks.service';

@CommandHandler(RestoreTaskCommand)
export class RestoreTaskHandler implements ICommandHandler<RestoreTaskCommand> {
  constructor(private readonly tasksService: TasksService) {}

  async execute(command: RestoreTaskCommand) {
    return this.tasksService.restore(command.id, command.userId);
  }
}
