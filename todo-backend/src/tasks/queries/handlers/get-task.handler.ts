import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTaskQuery } from '../get-task.query';
import { TasksService } from '../../tasks.service';

@QueryHandler(GetTaskQuery)
export class GetTaskHandler implements IQueryHandler<GetTaskQuery> {
  constructor(private readonly tasksService: TasksService) {}

  async execute(query: GetTaskQuery) {
    return this.tasksService.findOne(query.id, query.userId);
  }
}
