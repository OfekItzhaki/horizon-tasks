import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/auth.service';
import { User, LoginDto } from '@tasks-management/frontend-services';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: LoginDto) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const hasToken = authService.isAuthenticated();
  const [user, setUser] = useState<User | null>(null);
  const [userLoading, setUserLoading] = useState(hasToken);

  useEffect(() => {
    // Load user data in background if token exists
    // This doesn't block the UI from rendering
    if (hasToken) {
      const loadUser = async () => {
        try {
          const currentUser = await authService.getCurrentUser();
          setUser(currentUser);
        } catch {
          // Token might be invalid, clear it
          authService.logout();
          setUser(null);
        } finally {
          setUserLoading(false);
        }
      };

      loadUser();
    } else {
      setUserLoading(false);
    }
  }, [hasToken]);

  const login = async (credentials: LoginDto) => {
    const response = await authService.login(credentials);
    setUser(response.user);
  };

  const logout = async () => {
    authService.logout();
    setUser(null);
    setUserLoading(false);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading: userLoading, // Only show loading when actually fetching user data
        login,
        logout,
        updateUser,
        isAuthenticated: hasToken, // Use token check (instant) instead of user (slow)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
