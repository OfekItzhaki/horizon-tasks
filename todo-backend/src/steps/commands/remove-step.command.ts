export class RemoveStepCommand {
    constructor(
        public readonly stepId: number,
        public readonly userId: number,
    ) { }
}
