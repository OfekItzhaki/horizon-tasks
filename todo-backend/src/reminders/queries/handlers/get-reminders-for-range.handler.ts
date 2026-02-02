import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRemindersForRangeQuery } from '../get-reminders-for-range.query';
import { RemindersService } from '../../reminders.service';

@QueryHandler(GetRemindersForRangeQuery)
export class GetRemindersForRangeHandler
  implements IQueryHandler<GetRemindersForRangeQuery>
{
  constructor(private readonly remindersService: RemindersService) {}

  async execute(query: GetRemindersForRangeQuery) {
    return this.remindersService.getRemindersForDateRange(
      query.userId,
      query.startDate,
      query.endDate,
    );
  }
}
