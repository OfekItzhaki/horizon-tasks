export class GetStepsQuery {
    constructor(
        public readonly taskId: number,
        public readonly userId: number,
    ) { }
}
