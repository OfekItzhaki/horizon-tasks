import {
  authService as frontendAuthService,
  usersService,
  LoginDto,
  LoginResponse,
  User,
} from '@tasks-management/frontend-services';

class AuthService {
  async login(credentials: LoginDto): Promise<LoginResponse> {
    return frontendAuthService.login(credentials);
  }

  async logout(): Promise<void> {
    frontendAuthService.logout();
  }

  async getCurrentUser(): Promise<User> {
    return usersService.getCurrent();
  }

  isAuthenticated(): boolean {
    return frontendAuthService.isAuthenticated();
  }

  getToken(): string | null {
    return frontendAuthService.getToken();
  }

  async verifyEmail(token: string): Promise<User> {
    return frontendAuthService.verifyEmail(token);
  }

  async resendVerification(email: string): Promise<User> {
    return frontendAuthService.resendVerification(email);
  }
}

export const authService = new AuthService();
