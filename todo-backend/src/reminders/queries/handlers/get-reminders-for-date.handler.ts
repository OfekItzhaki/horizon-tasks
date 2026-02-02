import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRemindersForDateQuery } from '../get-reminders-for-date.query';
import { RemindersService } from '../../reminders.service';

@QueryHandler(GetRemindersForDateQuery)
export class GetRemindersForDateHandler
  implements IQueryHandler<GetRemindersForDateQuery>
{
  constructor(private readonly remindersService: RemindersService) {}

  async execute(query: GetRemindersForDateQuery) {
    return this.remindersService.getReminderNotifications(
      query.userId,
      query.date,
    );
  }
}
