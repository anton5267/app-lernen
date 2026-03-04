import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import 'react-native-reanimated';

import { GoogleWebProvider } from '@/components/auth/GoogleWebProvider';
import { AppProvider, useAppContext } from '@/context/AppContext';
import { googleClientId } from '@/services/authConfig';
import { getThemeTokens } from '@/theme/tokens';

function RootNavigator() {
  const { hydrated, resolvedTheme } = useAppContext();
  const themeTokens = useMemo(() => getThemeTokens(resolvedTheme), [resolvedTheme]);
  const isDarkLike = resolvedTheme === 'dark' || resolvedTheme === 'warm';
  const navigationTheme = useMemo(() => {
    const base = isDarkLike ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDarkLike,
      colors: {
        ...base.colors,
        background: themeTokens.colors.pageBg,
        card: themeTokens.colors.panelBg,
        border: themeTokens.colors.border,
        text: themeTokens.colors.textMain,
        primary: themeTokens.colors.primary,
      },
    };
  }, [isDarkLike, themeTokens]);

  if (!hydrated) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen
          name="movie/[id]"
          options={{
            headerShown: true,
            title: 'Деталі фільму',
            headerStyle: { backgroundColor: themeTokens.colors.panelBg },
            headerTintColor: themeTokens.colors.textMain,
          }}
        />
        <Stack.Screen
          name="tv/[id]"
          options={{
            headerShown: true,
            title: 'Деталі серіалу',
            headerStyle: { backgroundColor: themeTokens.colors.panelBg },
            headerTintColor: themeTokens.colors.textMain,
          }}
        />
        <Stack.Screen
          name="external"
          options={{
            headerShown: true,
            title: 'Плеєр',
            headerStyle: { backgroundColor: themeTokens.colors.panelBg },
            headerTintColor: themeTokens.colors.textMain,
          }}
        />
        <Stack.Screen
          name="shared/[token]"
          options={{
            headerShown: true,
            title: 'Публічна колекція',
            headerStyle: { backgroundColor: themeTokens.colors.panelBg },
            headerTintColor: themeTokens.colors.textMain,
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDarkLike ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <GoogleWebProvider clientId={googleClientId}>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </GoogleWebProvider>
  );
}
