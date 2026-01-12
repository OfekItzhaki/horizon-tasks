import {
  stepsService as frontendStepsService,
  Step,
  CreateStepDto,
  UpdateStepDto,
} from '@tasks-management/frontend-services';

class StepsService {
  async getStepsByTask(taskId: number): Promise<Step[]> {
    return frontendStepsService.getByTask(taskId);
  }

  async createStep(taskId: number, data: CreateStepDto): Promise<Step> {
    return frontendStepsService.create(taskId, data);
  }

  async updateStep(id: number, data: UpdateStepDto): Promise<Step> {
    return frontendStepsService.update(id, data);
  }

  async deleteStep(id: number): Promise<Step> {
    return frontendStepsService.delete(id);
  }

  async reorderSteps(taskId: number, stepIds: number[]): Promise<Step[]> {
    return frontendStepsService.reorder(taskId, stepIds);
  }
}

export const stepsService = new StepsService();

