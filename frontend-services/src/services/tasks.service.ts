import { apiClient } from '../utils/api-client';
import { Task, CreateTaskDto, UpdateTaskDto } from '../types';

export class TasksService {
  /**
   * Get all tasks (optionally filtered by list)
   */
  async getAll(todoListId?: number): Promise<Task[]> {
    const path = todoListId
      ? `/tasks?todoListId=${todoListId}` // Numeric IDs are safe, no encoding needed
      : '/tasks';
    return apiClient.get<Task[]>(path);
  }

  /**
   * Get tasks for a specific date
   */
  async getByDate(date?: string): Promise<Task[]> {
    if (date) {
      const encodedDate = encodeURIComponent(date);
      return apiClient.get<Task[]>(`/tasks/by-date?date=${encodedDate}`);
    }
    return apiClient.get<Task[]>('/tasks/by-date');
  }

  /**
   * Get task by ID
   */
  async getById(id: number): Promise<Task> {
    return apiClient.get<Task>(`/tasks/${id}`);
  }

  /**
   * Create a task in a list
   */
  async create(todoListId: number, data: CreateTaskDto): Promise<Task> {
    return apiClient.post<Task>(`/tasks/todo-list/${todoListId}`, data);
  }

  /**
   * Update task
   */
  async update(id: number, data: UpdateTaskDto): Promise<Task> {
    return apiClient.patch<Task>(`/tasks/${id}`, data);
  }

  /**
   * Delete task (soft delete)
   */
  async delete(id: number): Promise<Task> {
    return apiClient.delete<Task>(`/tasks/${id}`);
  }

  /**
   * Reorder tasks (updates the order property)
   */
  async reorderTasks(tasks: { id: number; order: number }[]): Promise<void> {
    // Sequentially update for simplicity and to avoid race conditions on order
    for (const task of tasks) {
      await this.update(task.id, { order: task.order });
    }
  }

  /**
   * Bulk update tasks
   */
  async bulkUpdate(ids: number[], data: UpdateTaskDto): Promise<void> {
    await Promise.all(ids.map((id) => this.update(id, data)));
  }

  /**
   * Bulk delete tasks
   */
  async bulkDelete(ids: number[]): Promise<void> {
    await Promise.all(ids.map((id) => this.delete(id)));
  }

  /**
   * Get user's tasks (optionally filtered by list)
   */
  async getMyTasks(todoListId?: number): Promise<Task[]> {
    const path = todoListId
      ? `/me/tasks?todoListId=${todoListId}` // Numeric IDs are safe, no encoding needed
      : '/me/tasks';
    return apiClient.get<Task[]>(path);
  }
}

export const tasksService = new TasksService();


