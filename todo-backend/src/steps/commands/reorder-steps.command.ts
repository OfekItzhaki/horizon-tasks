export class ReorderStepsCommand {
    constructor(
        public readonly taskId: number,
        public readonly userId: number,
        public readonly stepIds: number[],
    ) { }
}
