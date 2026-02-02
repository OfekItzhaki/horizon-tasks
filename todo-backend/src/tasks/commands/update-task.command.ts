import { UpdateTaskDto } from '../dto/update-task.dto';

export class UpdateTaskCommand {
  constructor(
    public readonly id: number,
    public readonly updateTaskDto: UpdateTaskDto,
    public readonly userId: number,
  ) {}
}
