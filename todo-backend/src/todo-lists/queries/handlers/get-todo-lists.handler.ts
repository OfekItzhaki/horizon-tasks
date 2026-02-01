import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTodoListsQuery } from '../get-todo-lists.query';
import { TodoListsService } from '../../todo-lists.service';

@QueryHandler(GetTodoListsQuery)
export class GetTodoListsHandler implements IQueryHandler<GetTodoListsQuery> {
  constructor(private readonly todoListsService: TodoListsService) {}

  async execute(query: GetTodoListsQuery) {
    return this.todoListsService.findAll(query.userId);
  }
}
