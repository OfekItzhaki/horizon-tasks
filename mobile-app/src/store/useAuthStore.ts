import { create } from 'zustand';
import { authService } from '../services/auth.service';
import { UserStorage } from '../utils/storage';
import { User } from '../types';

interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    // Actions
    loadUser: () => Promise<void>;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,

    setUser: (user) => set({ user, isAuthenticated: !!user }),

    loadUser: async () => {
        set({ isLoading: true });
        try {
            const tokenExists = await authService.isAuthenticated();
            if (!tokenExists) {
                set({ user: null, isAuthenticated: false });
                return;
            }
            const storedUser = await authService.getStoredUser();
            set({ user: storedUser, isAuthenticated: !!storedUser });
        } catch (error) {
            console.error('Error loading user:', error);
            set({ user: null, isAuthenticated: false });
        } finally {
            set({ isLoading: false });
        }
    },

    login: async (email, password) => {
        const response = await authService.login({ email, password });
        set({ user: response.user, isAuthenticated: true });

        // Notification logic
        try {
            const { AppPreferencesStorage } = await import('../utils/storage');
            const { requestNotificationPermissions } = await import('../services/notifications.service');

            const hasSeenPermission = await AppPreferencesStorage.hasSeenNotificationPermission();
            if (!hasSeenPermission) {
                setTimeout(async () => {
                    await requestNotificationPermissions(true);
                    await AppPreferencesStorage.setNotificationPermissionShown();
                }, 500);
            } else {
                setTimeout(async () => {
                    await requestNotificationPermissions(false);
                }, 500);
            }
        } catch (error) {
            console.error('Error requesting notifications:', error);
        }
    },

    register: async (email, password, name) => {
        await authService.register({ email, password, name });
    },

    logout: async () => {
        await authService.logout();
        set({ user: null, isAuthenticated: false });
    },

    refreshUser: async () => {
        try {
            const tokenExists = await authService.isAuthenticated();
            if (!tokenExists) {
                set({ user: null, isAuthenticated: false });
                return;
            }
            const { usersService } = await import('../services/users.service');
            const freshUser = await usersService.getCurrent();
            await UserStorage.setUser(freshUser);
            set({ user: freshUser, isAuthenticated: true });
        } catch (error) {
            console.error('Error refreshing user:', error);
            const storedUser = await authService.getStoredUser();
            set({ user: storedUser, isAuthenticated: !!storedUser });
        }
    },
}));
