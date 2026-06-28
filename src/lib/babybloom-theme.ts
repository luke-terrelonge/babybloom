import { MD3LightTheme } from 'react-native-paper'

export const bloomTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#4DB6AC',
    primaryContainer: '#E0F2F1',
    secondary: '#00796B',
    secondaryContainer: '#B2DFDB',
    tertiary: '#00695C',
    tertiaryContainer: '#B2DFDB',
    surface: '#FFFFFF',
    surfaceVariant: '#F5F5F5',
    background: '#FFFFFF',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onSurface: '#1A1A1A',
    onBackground: '#1A1A1A',
    outline: '#B2DFDB',
    outlineVariant: '#E0F2F1',
    error: '#EF4444',
    onError: '#FFFFFF',
    errorContainer: '#FEE2E2',
  },
}

export const COLORS = {
  primary: '#4DB6AC',
  surface: '#E0F2F1',
  light: '#B2DFDB',
  dark: '#00796B',
  darker: '#00695C',
  white: '#FFFFFF',
  text: '#1A1A1A',
  muted: '#6B7280',
  amber: '#F59E0B',
  red: '#EF4444',
  border: '#E5E7EB',
} as const
