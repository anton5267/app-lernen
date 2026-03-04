import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { HapticTab } from '@/components/HapticTab';
import { useAppContext } from '@/context/AppContext';
import { getThemeTokens } from '@/theme/tokens';

export default function TabLayout() {
  const { resolvedTheme } = useAppContext();
  const theme = getThemeTokens(resolvedTheme);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: theme.colors.panelBg,
            borderTopColor: theme.colors.border,
          },
          default: {
            backgroundColor: theme.colors.panelBg,
            borderTopColor: theme.colors.border,
          },
        }),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Пошук',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={22} name={focused ? 'search' : 'search-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Колекція',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={22} name={focused ? 'bookmark' : 'bookmark-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Історія',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={22} name={focused ? 'time' : 'time-outline'} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
