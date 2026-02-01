import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTodoListByIdQuery } from '../get-todo-list-by-id.query';
import { TodoListsService } from '../../todo-lists.service';

@QueryHandler(GetTodoListByIdQuery)
export class GetTodoListByIdHandler
  implements IQueryHandler<GetTodoListByIdQuery>
{
  constructor(private readonly todoListsService: TodoListsService) {}

  async execute(query: GetTodoListByIdQuery) {
    return this.todoListsService.findOne(query.id, query.userId);
  }
}
