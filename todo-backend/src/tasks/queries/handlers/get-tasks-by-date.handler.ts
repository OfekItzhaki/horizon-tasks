import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTasksByDateQuery } from '../get-tasks-by-date.query';
import { TasksService } from '../../tasks.service';

@QueryHandler(GetTasksByDateQuery)
export class GetTasksByDateHandler
  implements IQueryHandler<GetTasksByDateQuery>
{
  constructor(private readonly tasksService: TasksService) {}

  async execute(query: GetTasksByDateQuery) {
    return this.tasksService.getTasksByDate(query.userId, query.date);
  }
}
