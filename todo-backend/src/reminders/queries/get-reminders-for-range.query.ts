export class GetRemindersForRangeQuery {
  constructor(
    public readonly userId: number,
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {}
}
