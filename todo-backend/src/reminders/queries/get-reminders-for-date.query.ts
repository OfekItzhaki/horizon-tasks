export class GetRemindersForDateQuery {
  constructor(
    public readonly userId: number,
    public readonly date: Date,
  ) {}
}
