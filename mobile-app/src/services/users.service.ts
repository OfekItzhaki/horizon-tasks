import { apiClient, ApiError } from '../utils/api-client';
import { User, UpdateUserDto } from '../types';

export class UsersService {
  /**
   * Get current authenticated user
   */
  async getCurrent(): Promise<User> {
    try {
      const response = await apiClient.get<User[]>('/users');
      if (!response.data || response.data.length === 0) {
        throw new ApiError(404, 'No authenticated user found');
      }
      return response.data[0];
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to get current user');
    }
  }

  /**
   * Get user by ID
   */
  async getById(id: number): Promise<User> {
    try {
      const response = await apiClient.get<User>(`/users/${id}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to get user');
    }
  }

  /**
   * Update user profile
   */
  async update(id: number, data: UpdateUserDto): Promise<User> {
    try {
      const response = await apiClient.patch<User>(`/users/${id}`, data);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to update user');
    }
  }

  /**
   * Upload profile picture
   */
  async uploadAvatar(id: number, fileUri: string, fileName: string, fileType: string): Promise<User> {
    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: fileType,
      } as any);

      const response = await apiClient.post<User>(`/users/${id}/upload-avatar`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to upload avatar');
    }
  }
}

export const usersService = new UsersService();
