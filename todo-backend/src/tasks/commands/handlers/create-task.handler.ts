import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateTaskCommand } from '../create-task.command';
import { TasksService } from '../../tasks.service';

@CommandHandler(CreateTaskCommand)
export class CreateTaskHandler implements ICommandHandler<CreateTaskCommand> {
  constructor(private readonly tasksService: TasksService) {}

  async execute(command: CreateTaskCommand) {
    return this.tasksService.create(
      command.todoListId,
      command.createTaskDto,
      command.userId,
    );
  }
}
