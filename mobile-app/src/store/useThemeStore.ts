import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { lightColors, darkColors } from '../constants/colors';

export type ThemeMode = 'light' | 'dark' | 'auto';

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
