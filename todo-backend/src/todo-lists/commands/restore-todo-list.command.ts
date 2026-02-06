export class RestoreTodoListCommand {
    constructor(
        public readonly id: string,
        public readonly userId: string,
    ) { }
}
