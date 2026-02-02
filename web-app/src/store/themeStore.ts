import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeState {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    // Dynamic computed values
    getTheme: () => 'light' | 'dark';
    isDark: () => boolean;
}

export const useThemeStore = create<ThemeState>()(
    persist(
        (set, get) => ({
            themeMode: 'auto',
            setThemeMode: (themeMode) => set({ themeMode }),

            getTheme: () => {
                const { themeMode } = get();
                if (themeMode === 'auto') {
                    if (typeof window === 'undefined') return 'light';
                    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                }
                return themeMode;
            },

            isDark: () => get().getTheme() === 'dark',
        }),
        {
            name: 'tasks-management-theme',
        }
    )
);
