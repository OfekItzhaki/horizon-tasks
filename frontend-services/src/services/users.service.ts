import { apiClient } from '../utils/api-client';
import { User, CreateUserDto, UpdateUserDto } from '../types';

export class UsersService {
  /**
   * Register a new user
   */
  async create(data: CreateUserDto): Promise<User> {
    return apiClient.post<User>('/users', data);
  }

  /**
   * Get current authenticated user
   * Note: Backend returns an array, but we extract the first element
   * as this endpoint always returns a single user
   */
  async getCurrent(): Promise<User> {
    const users = await apiClient.get<User[]>('/users');
    if (!users || users.length === 0) {
      throw new Error('No authenticated user found');
    }
    return users[0];
  }

  /**
   * Get user by ID
   */
  async getById(id: number): Promise<User> {
    return apiClient.get<User>(`/users/${id}`);
  }

  /**
   * Update user profile
   */
  async update(id: number, data: UpdateUserDto): Promise<User> {
    return apiClient.patch<User>(`/users/${id}`, data);
  }

  /**
   * Soft delete user account
   */
  async delete(id: number): Promise<User> {
    return apiClient.delete<User>(`/users/${id}`);
  }

  /**
   * Upload profile picture
   */
  async uploadAvatar(id: number, file: File): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);

    return apiClient.post<User>(`/users/${id}/upload-avatar`, formData, {
      headers: {
        // Don't set Content-Type header - browser will set it with boundary for multipart/form-data
      },
    });
  }
}

export const usersService = new UsersService();


