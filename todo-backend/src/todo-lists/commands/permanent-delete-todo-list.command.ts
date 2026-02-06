export class PermanentDeleteTodoListCommand {
    constructor(
        public readonly id: string,
        public readonly userId: string,
    ) { }
}
