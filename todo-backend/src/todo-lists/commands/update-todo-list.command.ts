import { UpdateToDoListDto } from '../dto/update-todo-list.dto';

export class UpdateTodoListCommand {
  constructor(
    public readonly id: number,
    public readonly updateToDoListDto: UpdateToDoListDto,
    public readonly userId: number,
  ) {}
}
