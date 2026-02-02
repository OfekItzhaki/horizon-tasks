import { CreateTaskDto } from '../dto/create-task.dto';

export class CreateTaskCommand {
  constructor(
    public readonly todoListId: number,
    public readonly createTaskDto: CreateTaskDto,
    public readonly userId: number,
  ) {}
}
