import { Ionicons } from '@expo/vector-icons';
import { Stack, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/common/ActionButton';
import { useAppContext } from '@/context/AppContext';
import { getThemeTokens } from '@/theme/tokens';

export default function NotFoundScreen() {
  const { resolvedTheme } = useAppContext();
  const theme = getThemeTokens(resolvedTheme);

  return (
    <>
      <Stack.Screen options={{ title: 'Сторінку не знайдено' }} />
      <View style={[styles.screen, { backgroundColor: theme.colors.pageBg }]}>
        <View style={[styles.card, { backgroundColor: theme.colors.panelBg, borderColor: theme.colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: theme.colors.cardBg, borderColor: theme.colors.border }]}>
            <Ionicons name="compass-outline" size={28} color={theme.colors.textMain} />
          </View>
          <Text style={[styles.title, { color: theme.colors.textMain }]}>404</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
            Схоже, цієї сторінки більше немає або посилання застаріло.
          </Text>

          <View style={styles.actions}>
            <ActionButton
              label="До пошуку"
              iconName="search-outline"
              backgroundColor={theme.colors.primary}
              onPress={() => router.replace('/(tabs)' as never)}
            />
            <ActionButton
              label="Авторизація"
              iconName="log-in-outline"
              backgroundColor={theme.colors.secondary}
              textColor={theme.colors.textMain}
              onPress={() => router.push('/auth' as never)}
            />
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 560,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderWidth: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 44,
    fontWeight: '900',
    fontFamily: 'SpaceMono',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 460,
  },
  actions: {
    width: '100%',
    marginTop: 8,
    gap: 8,
  },
});

