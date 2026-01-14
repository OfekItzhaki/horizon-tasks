import { useTheme, lightColors, darkColors } from '../context/ThemeContext';
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };

export function useThemedStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  createStyles: (colors: typeof lightColors) => T
): T {
  const { isDark } = useTheme();
  const colors = isDark ? darkColors : lightColors;
  return StyleSheet.create(createStyles(colors));
}
