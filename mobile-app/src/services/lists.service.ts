import { apiClient, ApiError } from '../utils/api-client';
import { ToDoList, CreateTodoListDto, UpdateTodoListDto } from '../types';

export class ListsService {
  /**
   * Get all lists for the authenticated user
   */
  async getAll(): Promise<ToDoList[]> {
    try {
      console.log('ListsService.getAll() - Fetching lists...');
      const response = await apiClient.get<ToDoList[]>('/todo-lists');
      console.log('ListsService.getAll() - Raw response:', response);
      console.log('ListsService.getAll() - response.data:', response.data);
      return response.data;
    } catch (error) {
      console.error('ListsService.getAll() - Error:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to fetch lists');
    }
  }

  /**
   * Get a list by ID
   */
  async getById(id: number): Promise<ToDoList> {
    try {
      const response = await apiClient.get<ToDoList>(`/todo-lists/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to fetch list');
    }
  }

  /**
   * Create a new list
   */
  async create(data: CreateTodoListDto): Promise<ToDoList> {
    try {
      const response = await apiClient.post<ToDoList>('/todo-lists', data);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to create list');
    }
  }

  /**
   * Update a list
   */
  async update(id: number, data: UpdateTodoListDto): Promise<ToDoList> {
    try {
      const response = await apiClient.patch<ToDoList>(
        `/todo-lists/${id}`,
        data,
      );
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to update list');
    }
  }

  /**
   * Delete a list (soft delete)
   */
  async delete(id: number): Promise<void> {
    try {
      await apiClient.delete(`/todo-lists/${id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to delete list');
    }
  }
}

export const listsService = new ListsService();
