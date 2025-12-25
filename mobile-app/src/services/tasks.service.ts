import { apiClient, ApiError } from '../utils/api-client';
import {
  Task,
  CreateTaskDto,
  UpdateTaskDto,
} from '../types';

export class TasksService {
  /**
   * Get all tasks (optionally filtered by list)
   */
  async getAll(todoListId?: number): Promise<Task[]> {
    try {
      const params = todoListId ? { todoListId } : {};
      const response = await apiClient.get<Task[]>('/tasks', { params });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to fetch tasks');
    }
  }

  /**
   * Get tasks for a specific date
   */
  async getByDate(date: string): Promise<Task[]> {
    try {
      const response = await apiClient.get<Task[]>('/tasks/by-date', {
        params: { date },
      });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to fetch tasks by date');
    }
  }

  /**
   * Get a task by ID
   */
  async getById(id: number): Promise<Task> {
    try {
      const response = await apiClient.get<Task>(`/tasks/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to fetch task');
    }
  }

  /**
   * Create a task in a list
   */
  async create(todoListId: number, data: CreateTaskDto): Promise<Task> {
    try {
      const response = await apiClient.post<Task>(
        `/tasks/todo-list/${todoListId}`,
        data,
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to create task');
    }
  }

  /**
   * Update a task
   */
  async update(id: number, data: UpdateTaskDto): Promise<Task> {
    try {
      const response = await apiClient.patch<Task>(`/tasks/${id}`, data);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to update task');
    }
  }

  /**
   * Delete a task (soft delete)
   */
  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/tasks/${id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to delete task');
    }
  }

  /**
   * Restore an archived task to its original list
   */
  async restore(id: number): Promise<Task> {
    try {
      const response = await apiClient.post<Task>(`/tasks/${id}/restore`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to restore task');
    }
  }

  /**
   * Permanently delete an archived task (hard delete, cannot be undone)
   */
  async permanentDelete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/tasks/${id}/permanent`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to permanently delete task');
    }
  }
}
>>>>>>> main

  /**
   * Restore a soft-deleted task
   */
  async restore(id: number): Promise<Task> {
    try {
      const response = await apiClient.patch<Task>(`/tasks/${id}/restore`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to restore task');
    }
  }

  /**
   * Permanently delete a task
   */
  async permanentDelete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/tasks/${id}/permanent`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to permanently delete task');
    }
  }
}

export const tasksService = new TasksService();
