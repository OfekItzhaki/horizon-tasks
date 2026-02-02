import React, { createContext, useContext, useMemo } from 'react';
import { useThemeStore } from '../store/useThemeStore';
import { lightColors, darkColors } from '../constants/colors';

export { lightColors, darkColors };

type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: 'light' | 'dark';
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
  colors: typeof lightColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeMode, setThemeMode, getTheme, getColors, isDark: checkIsDark } = useThemeStore();

  // Use useMemo to ensure we always have a valid colors object even if the store is re-hydrating
  const themeContextValue = useMemo(() => {
    const theme = getTheme();
    const isDark = checkIsDark();
    const colors = getColors() || (isDark ? darkColors : lightColors);

    return {
      theme,
      themeMode,
      setThemeMode,
      isDark,
      colors,
    };
  }, [themeMode, setThemeMode, getTheme, getColors, checkIsDark]);

  return (
    <ThemeContext.Provider value={themeContextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
