import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTasksQuery } from '../get-tasks.query';
import { TasksService } from '../../tasks.service';

@QueryHandler(GetTasksQuery)
export class GetTasksHandler implements IQueryHandler<GetTasksQuery> {
  constructor(private readonly tasksService: TasksService) {}

  async execute(query: GetTasksQuery) {
    return this.tasksService.findAll(query.userId, query.todoListId);
  }
}
