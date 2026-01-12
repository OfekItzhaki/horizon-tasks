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
}

export const authService = new AuthService();
