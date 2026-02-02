export class RemoveTaskCommand {
  constructor(
    public readonly id: number,
    public readonly userId: number,
  ) {}
}
