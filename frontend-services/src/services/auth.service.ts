import { apiClient } from '../utils/api-client';
import { TokenStorage } from '../utils/storage';
import { LoginDto, LoginResponse, User } from '../types';

export class AuthService {
  /**
   * Login with email and password
   */
  async login(credentials: LoginDto): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/auth/login',
      credentials,
    );
    TokenStorage.setToken(response.accessToken);
    return response;
  }

  /**
   * Logout (removes token from storage)
   */
  logout(): void {
    TokenStorage.removeToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return TokenStorage.hasToken();
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return TokenStorage.getToken();
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<User> {
    // Encode token in path segment to handle special characters
    const encodedToken = encodeURIComponent(token);
    return apiClient.post<User>(`/auth/verify-email/${encodedToken}`);
  }

  /**
   * Resend verification email
   */
  async resendVerification(email: string): Promise<User> {
    return apiClient.post<User>('/auth/resend-verification', { email });
  }

  /**
   * Start registration (send OTP)
   */
  async registerStart(email: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>('/auth/register/start', { email });
  }

  /**
   * Verify OTP for registration
   */
  async registerVerify(
    email: string,
    otp: string,
  ): Promise<{ registrationToken: string }> {
    return apiClient.post<{ registrationToken: string }>('/auth/register/verify', {
      email,
      otp,
    });
  }

  /**
   * Complete registration with password
   */
  async registerFinish(data: {
    registrationToken: string;
    password: string;
    passwordConfirm: string;
  }): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>(
      '/auth/register/finish',
      data,
    );
    TokenStorage.setToken(response.accessToken);
    return response;
  }
}

export const authService = new AuthService();


