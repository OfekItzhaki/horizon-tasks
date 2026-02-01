export class GetTasksQuery {
  constructor(
    public readonly userId: number,
    public readonly todoListId?: number,
  ) {}
}
