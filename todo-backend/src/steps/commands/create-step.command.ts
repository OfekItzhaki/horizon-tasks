import { CreateStepDto } from '../dto/create-step.dto';

export class CreateStepCommand {
    constructor(
        public readonly taskId: number,
        public readonly dto: CreateStepDto,
        public readonly userId: number,
    ) { }
}
