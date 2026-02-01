export class PermanentDeleteTaskCommand {
  constructor(
    public readonly id: number,
    public readonly userId: number,
  ) {}
}
