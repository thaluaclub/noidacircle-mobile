export const colors = {
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  dark: {
    bg: '#0f0f0f',
    card: '#1a1a1a',
    border: '#2a2a2a',
    hover: '#333333',
    text: '#e5e5e5',
    muted: '#a3a3a3',
  },
  light: {
    bg: '#ffffff',
    card: '#f9fafb',
    border: '#e5e7eb',
    hover: '#f3f4f6',
    text: '#111827',
    muted: '#6b7280',
  },
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  white: '#ffffff',
  black: '#000000',
};

export const lightTheme = {
  dark: false as const,
  colors: {
    primary: colors.primary[500],
    background: colors.light.bg,
    card: colors.light.card,
    text: colors.light.text,
    border: colors.light.border,
    notification: colors.error,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};

export const darkTheme = {
  dark: true as const,
  colors: {
    primary: colors.primary[500],
    background: colors.dark.bg,
    card: colors.dark.card,
    text: colors.dark.text,
    border: colors.dark.border,
    notification: colors.error,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};
