export class GetTasksByDateQuery {
  constructor(
    public readonly userId: number,
    public readonly date: Date,
  ) {}
}
