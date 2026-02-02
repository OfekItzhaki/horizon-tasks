import { UpdateStepDto } from '../dto/update-step.dto';

export class UpdateStepCommand {
    constructor(
        public readonly stepId: number,
        public readonly dto: UpdateStepDto,
        public readonly userId: number,
    ) { }
}
