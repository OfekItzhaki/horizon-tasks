import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTasksWithRemindersQuery } from '../get-tasks-with-reminders.query';
import { TasksService } from '../../tasks.service';

@QueryHandler(GetTasksWithRemindersQuery)
export class GetTasksWithRemindersHandler
  implements IQueryHandler<GetTasksWithRemindersQuery>
{
  constructor(private readonly tasksService: TasksService) {}

  async execute(query: GetTasksWithRemindersQuery) {
    return this.tasksService.getTasksWithReminders(query.userId, query.date);
  }
}
