import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const tokenExists = await authService.isAuthenticated();
      setHasToken(tokenExists);
      
      if (!tokenExists) {
        setUser(null);
        return;
      }
      const storedUser = await authService.getStoredUser();
      setUser(storedUser);
    } catch (error) {
      console.error('Error loading user:', error);
      setUser(null);
      setHasToken(false);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    setUser(response.user);
    setHasToken(true);
  };

  const register = async (email: string, password: string, name: string) => {
    await authService.register({ email, password, name });
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
    setHasToken(false);
  };

  const refreshUser = async () => {
    try {
      const tokenExists = await authService.isAuthenticated();
      if (!tokenExists) {
        setUser(null);
        setHasToken(false);
        return;
      }
      // Fetch fresh user data from API
      const { usersService } = await import('../services/users.service');
      const freshUser = await usersService.getCurrent();
      await UserStorage.setUser(freshUser);
      setUser(freshUser);
      setHasToken(true);
    } catch (error) {
      console.error('Error refreshing user:', error);
      // Fallback to stored user
      const storedUser = await authService.getStoredUser();
      setUser(storedUser);
    }
  };

  // Re-check authentication state periodically (catches 401 token clears)
  useEffect(() => {
    const checkAuthState = async () => {
      const tokenExists = await authService.isAuthenticated();
      if (!tokenExists) {
        if (user || hasToken) {
          // Token was cleared - update state
          setUser(null);
          setHasToken(false);
        }
      } else {
        setHasToken(true);
      }
    };
    
    // Check every 3 seconds
    const interval = setInterval(checkAuthState, 3000);
    return () => clearInterval(interval);
  }, [user, hasToken]);

  // Check both user and token for authentication
  const isAuthenticated = user !== null && hasToken;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
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








