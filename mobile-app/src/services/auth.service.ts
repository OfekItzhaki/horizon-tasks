import { apiClient, ApiError } from '../utils/api-client';
import { TokenStorage, UserStorage } from '../utils/storage';
import {
  LoginDto,
  LoginResponse,
  User,
  CreateUserDto,
} from '../types';

export class AuthService {
  /**
   * Login with email and password
   */
  async login(credentials: LoginDto): Promise<LoginResponse> {
    try {
      const response = await apiClient.post<LoginResponse>(
        '/auth/login',
        credentials,
      );
      // response.data is already normalized by api-client interceptor
      await TokenStorage.setToken(response.data.accessToken);
      await UserStorage.setUser(response.data.user);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Login failed');
    }
  }

  /**
   * Register a new user
   */
  async register(data: CreateUserDto): Promise<User> {
    try {
      const response = await apiClient.post<User>('/users', data);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Registration failed');
    }
  }

  /**
   * Logout (removes token from storage)
   */
  async logout(): Promise<void> {
    await TokenStorage.removeToken();
    await UserStorage.removeUser();
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await TokenStorage.hasToken();
  }

  /**
   * Get stored token
   */
  async getToken(): Promise<string | null> {
    return await TokenStorage.getToken();
  }

  /**
   * Get stored user
   */
  async getStoredUser(): Promise<User | null> {
    return await UserStorage.getUser();
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<User> {
    try {
      // Encode token in path segment to handle special characters
      const encodedToken = encodeURIComponent(token);
      const response = await apiClient.post<User>(`/auth/verify-email/${encodedToken}`);
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Email verification failed');
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<User> {
    try {
      const response = await apiClient.post<User>('/auth/resend-verification', {
        email,
      });
      return response.data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(0, 'Failed to resend verification email');
    }
  }
}

export const authService = new AuthService();
