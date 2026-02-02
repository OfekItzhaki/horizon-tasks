import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'auto';

export const lightColors = {
    background: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: 'rgba(148, 163, 184, 0.2)',
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    primaryLight: '#818cf8',
    purple: '#a855f7',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    card: 'rgba(255, 255, 255, 0.7)',
    cardGlass: 'rgba(255, 255, 255, 0.8)',
    shadow: 'rgba(99, 102, 241, 0.15)',
    shadowStrong: 'rgba(99, 102, 241, 0.3)',
    gradientStart: '#6366f1',
    gradientEnd: '#a855f7',
};

export const darkColors = {
    background: '#0f172a',
    surface: '#1e293b',
    text: '#f1f5f9',
    textSecondary: '#cbd5e1',
    border: 'rgba(148, 163, 184, 0.2)',
    primary: '#6366f1',
    primaryDark: '#4f46e5',
    primaryLight: '#818cf8',
    purple: '#a855f7',
    error: '#ef4444',
    success: '#10b981',
    warning: '#f59e0b',
    card: 'rgba(30, 41, 59, 0.7)',
    cardGlass: 'rgba(30, 41, 59, 0.8)',
    shadow: 'rgba(99, 102, 241, 0.25)',
    shadowStrong: 'rgba(99, 102, 241, 0.4)',
    gradientStart: '#6366f1',
    gradientEnd: '#a855f7',
};

interface ThemeState {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    // Dynamic computed values (not persisted)
    getTheme: () => 'light' | 'dark';
    getColors: () => typeof lightColors;
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
                    return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
                }
                return themeMode;
            },

            isDark: () => get().getTheme() === 'dark',

            getColors: () => (get().getTheme() === 'dark' ? darkColors : lightColors),
        }),
        {
            name: 'theme-storage',
            storage: createJSONStorage(() => AsyncStorage),
            // Only persist themeMode
            partialize: (state) => ({ themeMode: state.themeMode }),
        }
    )
);
