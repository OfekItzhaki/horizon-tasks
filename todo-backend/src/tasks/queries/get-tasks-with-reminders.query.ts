export class GetTasksWithRemindersQuery {
  constructor(
    public readonly userId: number,
    public readonly date: Date,
  ) {}
}
