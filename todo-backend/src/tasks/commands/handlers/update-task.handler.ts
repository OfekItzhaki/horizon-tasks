import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UpdateTaskCommand } from '../update-task.command';
import { TasksService } from '../../tasks.service';

@CommandHandler(UpdateTaskCommand)
export class UpdateTaskHandler implements ICommandHandler<UpdateTaskCommand> {
  constructor(private readonly tasksService: TasksService) {}

  async execute(command: UpdateTaskCommand) {
    return this.tasksService.update(
      command.id,
      command.updateTaskDto,
      command.userId,
    );
  }
}
