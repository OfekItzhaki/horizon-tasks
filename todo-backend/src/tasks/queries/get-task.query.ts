export class GetTaskQuery {
  constructor(
    public readonly id: number,
    public readonly userId: number,
  ) {}
}
