import { CreateToDoListDto } from '../dto/create-todo-list.dto';

export class CreateTodoListCommand {
  constructor(
    public readonly createToDoListDto: CreateToDoListDto,
    public readonly userId: number,
  ) {}
}
