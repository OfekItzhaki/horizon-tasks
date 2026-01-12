import {
  apiClient,
  tasksService as frontendTasksService,
  Task,
  CreateTaskDto,
  UpdateTaskDto,
} from '@tasks-management/frontend-services';

class TasksService {
  async getAllTasks(todoListId?: number): Promise<Task[]> {
    return frontendTasksService.getAll(todoListId);
  }

  async getTasksByList(todoListId: number): Promise<Task[]> {
    return frontendTasksService.getAll(todoListId);
  }

  async getTasksByDate(date?: string): Promise<Task[]> {
    return frontendTasksService.getByDate(date);
  }

  async getTaskById(id: number): Promise<Task> {
    return frontendTasksService.getById(id);
  }

  async createTask(todoListId: number, data: CreateTaskDto): Promise<Task> {
    return frontendTasksService.create(todoListId, data);
  }

  async updateTask(id: number, data: UpdateTaskDto): Promise<Task> {
    return frontendTasksService.update(id, data);
  }

  async deleteTask(id: number): Promise<Task> {
    return frontendTasksService.delete(id);
  }

  async restoreTask(id: number): Promise<Task> {
    return apiClient.post<Task>(`/tasks/${id}/restore`);
  }

  async permanentDeleteTask(id: number): Promise<Task> {
    return apiClient.delete<Task>(`/tasks/${id}/permanent`);
  }
}

export const tasksService = new TasksService();
