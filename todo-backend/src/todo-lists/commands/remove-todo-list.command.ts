export class RemoveTodoListCommand {
  constructor(
    public readonly id: number,
    public readonly userId: number,
  ) {}
}
