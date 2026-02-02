import { useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { lightColors } from '../constants/colors';
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function useThemedStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  createStyles: (colors: typeof lightColors) => T
): T {
  const { colors } = useTheme();

  return useMemo(() => {
    if (!colors) {
      // Fallback to light colors if for some reason context is not ready
      // though useTheme() should have thrown an error if context was undefined.
      // This is an extra safety layer.
      return StyleSheet.create(createStyles(lightColors));
    }
    return StyleSheet.create(createStyles(colors));
  }, [colors, createStyles]);
}
