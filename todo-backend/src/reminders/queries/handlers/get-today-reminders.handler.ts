import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetTodayRemindersQuery } from '../get-today-reminders.query';
import { RemindersService } from '../../reminders.service';

@QueryHandler(GetTodayRemindersQuery)
export class GetTodayRemindersHandler
  implements IQueryHandler<GetTodayRemindersQuery>
{
  constructor(private readonly remindersService: RemindersService) {}

  async execute(query: GetTodayRemindersQuery) {
    return this.remindersService.getTodayReminders(query.userId);
  }
}
