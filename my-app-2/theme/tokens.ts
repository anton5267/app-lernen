export type ResolvedThemeMode = 'light' | 'dark' | 'warm';

export type ThemeTokens = {
  colors: {
    pageBg: string;
    panelBg: string;
    cardBg: string;
    inputBg: string;
    textMain: string;
    textMuted: string;
    border: string;
    primary: string;
    secondary: string;
    success: string;
    danger: string;
    info: string;
    warning: string;
    live: string;
  };
  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    pill: number;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
};

export function getThemeTokens(mode: ResolvedThemeMode): ThemeTokens {
  if (mode === 'dark') {
    return {
      colors: {
        pageBg: '#07080d',
        panelBg: '#0f131c',
        cardBg: '#181d2a',
        inputBg: '#141a28',
        textMain: '#eef2ff',
        textMuted: '#98a3bb',
        border: '#29344c',
        primary: '#ff5a2d',
        secondary: '#24314c',
        success: '#22c55e',
        danger: '#ef4444',
        info: '#0ea5e9',
        warning: '#f59e0b',
        live: '#f43f5e',
      },
      radius: {
        sm: 8,
        md: 10,
        lg: 14,
        xl: 18,
        pill: 999,
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
      },
    };
  }

  if (mode === 'warm') {
    return {
      colors: {
        pageBg: '#18100c',
        panelBg: '#241710',
        cardBg: '#2f1f15',
        inputBg: '#3a281c',
        textMain: '#fef3e8',
        textMuted: '#d8bca3',
        border: '#5e4331',
        primary: '#f97316',
        secondary: '#4f3828',
        success: '#22c55e',
        danger: '#ef4444',
        info: '#0ea5e9',
        warning: '#f59e0b',
        live: '#fb7185',
      },
      radius: {
        sm: 8,
        md: 10,
        lg: 14,
        xl: 18,
        pill: 999,
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
      },
    };
  }

  return {
    colors: {
      pageBg: '#f2f5fb',
      panelBg: '#ffffff',
      cardBg: '#eef3ff',
      inputBg: '#f8faff',
      textMain: '#0f172a',
      textMuted: '#5b6780',
      border: '#d7e0f2',
      primary: '#1e40af',
      secondary: '#dbe7ff',
      success: '#15803d',
      danger: '#dc2626',
      info: '#0369a1',
      warning: '#b45309',
      live: '#dc2626',
    },
    radius: {
      sm: 8,
      md: 10,
      lg: 14,
      xl: 18,
      pill: 999,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 12,
      lg: 16,
      xl: 24,
    },
  };
}
