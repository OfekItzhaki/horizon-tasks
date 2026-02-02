import { create } from 'zustand';
import { authService } from '../services/auth.service';
import { User, LoginDto } from '@tasks-management/frontend-services';

interface AuthState {
    user: User | null;
    loading: boolean;
    isAuthenticated: boolean;

    // Actions
    initialize: () => Promise<void>;
    login: (credentials: LoginDto) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    loading: true,
    isAuthenticated: authService.isAuthenticated(),

    initialize: async () => {
        const hasToken = authService.isAuthenticated();
        if (!hasToken) {
            set({ loading: false, user: null, isAuthenticated: false });
            return;
        }

        try {
            const currentUser = await authService.getCurrentUser();
            set({ user: currentUser, isAuthenticated: true, loading: false });
        } catch {
            authService.logout();
            set({ user: null, isAuthenticated: false, loading: false });
        }
    },

    login: async (credentials) => {
        const response = await authService.login(credentials);
        set({ user: response.user, isAuthenticated: true });
    },

    logout: async () => {
        authService.logout();
        set({ user: null, isAuthenticated: false, loading: false });
    },

    updateUser: (user) => set({ user }),
}));
