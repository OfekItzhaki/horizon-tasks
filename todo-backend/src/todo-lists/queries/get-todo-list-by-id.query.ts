export class GetTodoListByIdQuery {
  constructor(
    public readonly id: number,
    public readonly userId: number,
  ) {}
}
