import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { ActionButton } from '@/components/common/ActionButton';
import { AuthRequiredGate } from '@/components/common/AuthRequiredGate';
import { ScrollTopFab } from '@/components/common/ScrollTopFab';
import { ScreenPanel } from '@/components/common/ScreenPanel';
import { StatusBanner, StatusBannerState } from '@/components/common/StatusBanner';
import { useAppContext } from '@/context/AppContext';
import { filterViewingHistory, HistoryTypeFilter, historyMediaTypeLabel } from '@/features/history/utils';
import { useScrollTop } from '@/hooks/useScrollTop';
import { clearViewingHistory, getViewingHistory } from '@/services/movieApi';
import { getThemeTokens } from '@/theme/tokens';
import { ViewingHistoryItem } from '@/types/api';

const HISTORY_FILTER_OPTIONS: { value: HistoryTypeFilter; label: string }[] = [
  { value: 'all', label: 'Усі' },
  { value: 'movie', label: 'Фільми' },
  { value: 'tv', label: 'Серіали' },
  { value: 'video', label: 'Відео' },
];

export default function HistoryScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1080;
  const { scrollRef, showScrollTop, onScroll, scrollToTop } = useScrollTop(520);
  const { resolvedTheme, isAuthenticated, user } = useAppContext();

  const [items, setItems] = useState<ViewingHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<StatusBannerState>(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<HistoryTypeFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const palette = useMemo(() => {
    const theme = getThemeTokens(resolvedTheme);
    return {
      pageBg: theme.colors.pageBg,
      panelBg: theme.colors.panelBg,
      cardBg: theme.colors.cardBg,
      textMain: theme.colors.textMain,
      textMuted: theme.colors.textMuted,
      border: theme.colors.border,
      primary: theme.colors.primary,
      info: theme.colors.info,
      success: theme.colors.success,
      danger: theme.colors.danger,
      warning: theme.colors.warning,
    };
  }, [resolvedTheme]);

  const loadHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setLastUpdatedAt(null);
      return;
    }

    setLoading(true);
    try {
      const nextItems = await getViewingHistory(100);
      setItems(nextItems);
      setLastUpdatedAt(new Date().toLocaleTimeString('uk-UA'));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося завантажити історію';
      setBanner({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadHistory().catch(() => {
      // already handled
    });
  }, [loadHistory]);

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadHistory();
      setBanner({ type: 'info', message: 'Історію оновлено.' });
    } finally {
      setRefreshing(false);
    }
  }, [loadHistory]);

  const clearHistory = useCallback(async () => {
    try {
      const result = await clearViewingHistory();
      setItems([]);
      setBanner({ type: 'success', message: `Історію очищено (${result.cleared}).` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося очистити історію';
      setBanner({ type: 'error', message });
    }
  }, []);

  const openHistoryItem = useCallback((item: ViewingHistoryItem) => {
    if (item.mediaType === 'movie') {
      router.push(`/movie/${item.contentId}` as never);
      return;
    }
    if (item.mediaType === 'tv') {
      router.push(`/tv/${item.contentId}` as never);
      return;
    }

    const channel = item.channelTitle ? encodeURIComponent(item.channelTitle) : '';
    router.push(
      `/external?source=${item.mediaType}&id=${encodeURIComponent(item.contentId)}&channel=${channel}` as never
    );
  }, []);

  const filteredItems = useMemo(() => {
    return filterViewingHistory(items, { query, typeFilter });
  }, [items, query, typeFilter]);

  const stats = useMemo(() => {
    const movies = items.filter((item) => item.mediaType === 'movie').length;
    const tv = items.filter((item) => item.mediaType === 'tv').length;
    const videos = items.filter((item) => item.mediaType === 'youtube' || item.mediaType === 'twitch').length;
    return {
      total: items.length,
      movies,
      tv,
      videos,
    };
  }, [items]);

  const emptyStateText = useMemo(() => {
    if (items.length === 0) {
      return 'Історія порожня. Відкрийте сторінки деталей фільмів/серіалів або плеєр YouTube/Twitch.';
    }

    if (query.trim() || typeFilter !== 'all') {
      return 'За поточним пошуком або фільтром нічого не знайдено.';
    }

    return 'Немає елементів для відображення.';
  }, [items.length, query, typeFilter]);

  if (!isAuthenticated) {
    return (
      <AuthRequiredGate
        backgroundColor={palette.pageBg}
        titleColor={palette.textMain}
        textColor={palette.textMuted}
        buttonColor={palette.primary}
        title="Історія переглядів"
        description="Увійдіть, щоб бачити ваші останні переглянуті фільми, серіали та відео."
        buttonLabel="Перейти до авторизації"
        onPress={() => router.push('/auth')}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.pageBg }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.container, { backgroundColor: palette.pageBg }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }>
      <ScreenPanel backgroundColor={palette.panelBg} borderColor={palette.border}>
        <Text style={[styles.title, { color: palette.textMain }]}>Історія переглядів</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          {user?.name} • показано {filteredItems.length} з {items.length}
        </Text>

        <View style={[styles.searchInputWrap, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <Ionicons name="search-outline" size={16} color={palette.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: palette.textMain }]}
            value={query}
            onChangeText={setQuery}
            placeholder="Пошук в історії (назва, канал, рік)"
            placeholderTextColor={palette.textMuted}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} style={styles.clearQueryButton}>
              <Ionicons name="close-circle" size={18} color={palette.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statsCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Text style={[styles.statsValue, { color: palette.textMain }]}>{stats.total}</Text>
            <Text style={[styles.statsLabel, { color: palette.textMuted }]}>Усього</Text>
          </View>
          <View style={[styles.statsCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Text style={[styles.statsValue, { color: palette.textMain }]}>{stats.movies}</Text>
            <Text style={[styles.statsLabel, { color: palette.textMuted }]}>Фільми</Text>
          </View>
          <View style={[styles.statsCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Text style={[styles.statsValue, { color: palette.textMain }]}>{stats.tv}</Text>
            <Text style={[styles.statsLabel, { color: palette.textMuted }]}>Серіали</Text>
          </View>
          <View style={[styles.statsCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Text style={[styles.statsValue, { color: palette.textMain }]}>{stats.videos}</Text>
            <Text style={[styles.statsLabel, { color: palette.textMuted }]}>Відео</Text>
          </View>
        </View>

        {lastUpdatedAt ? (
          <Text style={[styles.lastUpdatedText, { color: palette.textMuted }]}>Оновлено: {lastUpdatedAt}</Text>
        ) : null}

        <View style={styles.filtersRow}>
          {HISTORY_FILTER_OPTIONS.map((option) => (
            <ActionButton
              key={option.value}
              label={option.label}
              compact
              backgroundColor={typeFilter === option.value ? palette.primary : palette.cardBg}
              textColor={typeFilter === option.value ? '#ffffff' : palette.textMain}
              onPress={() => setTypeFilter(option.value)}
            />
          ))}
        </View>

        <View style={styles.actionsRow}>
          <ActionButton
            label={loading ? 'Оновлення...' : 'Оновити'}
            backgroundColor={palette.info}
            iconName="refresh-outline"
            compact
            onPress={() => loadHistory()}
          />
          <ActionButton
            label="Очистити"
            backgroundColor={items.length === 0 ? palette.cardBg : palette.danger}
            iconName="trash-outline"
            compact
            disabled={items.length === 0}
            onPress={clearHistory}
          />
        </View>

        <StatusBanner
          banner={banner}
          errorColor={palette.danger}
          successColor={palette.success}
          infoColor={palette.textMain}
          containerStyle={styles.bannerText}
        />
      </ScreenPanel>

      {filteredItems.length === 0 ? (
        <ScreenPanel backgroundColor={palette.panelBg} borderColor={palette.border}>
          {loading ? <ActivityIndicator size="small" color={palette.primary} /> : null}
          <Text style={{ color: palette.textMuted }}>{emptyStateText}</Text>
          {(query.trim().length > 0 || typeFilter !== 'all') && !loading ? (
            <View style={styles.emptyActionsRow}>
              {query.trim().length > 0 ? (
                <ActionButton
                  label="Очистити пошук"
                  compact
                  iconName="close-outline"
                  backgroundColor={palette.cardBg}
                  textColor={palette.textMain}
                  onPress={() => setQuery('')}
                />
              ) : null}
              {typeFilter !== 'all' ? (
                <ActionButton
                  label="Скинути фільтр"
                  compact
                  iconName="refresh-outline"
                  backgroundColor={palette.warning}
                  onPress={() => setTypeFilter('all')}
                />
              ) : null}
            </View>
          ) : null}
        </ScreenPanel>
      ) : (
        <View style={[styles.cardsWrap, isWide && styles.cardsWrapWide]}>
          {filteredItems.map((item) => (
            <View key={item.id} style={[styles.card, isWide && styles.cardWide, { backgroundColor: palette.panelBg, borderColor: palette.border }]}> 
              {item.poster ? (
                <Image source={{ uri: item.poster }} style={styles.poster} resizeMode="cover" />
              ) : (
                <View style={[styles.posterFallback, { backgroundColor: palette.cardBg, borderColor: palette.border }]}> 
                  <Ionicons name="film-outline" size={18} color={palette.textMuted} />
                  <Text style={{ color: palette.textMuted, fontSize: 12 }}>Без постера</Text>
                </View>
              )}

              <View style={styles.cardBody}>
                <Text style={[styles.badge, { backgroundColor: palette.primary }]}>{historyMediaTypeLabel(item.mediaType)}</Text>
                <Text style={[styles.cardTitle, { color: palette.textMain }]}>{item.title}</Text>
                <Text style={[styles.cardMeta, { color: palette.textMuted }]}>
                  {item.year ?? '—'} • {item.rating ?? '—'}/10
                  {item.channelTitle ? ` • ${item.channelTitle}` : ''}
                </Text>
                <Text style={[styles.cardMeta, { color: palette.textMuted }]}>Переглянуто: {new Date(item.viewedAt).toLocaleString('uk-UA')}</Text>

                <ActionButton
                  label="Відкрити"
                  iconName="open-outline"
                  compact
                  style={styles.openButton}
                  backgroundColor={palette.primary}
                  onPress={() => openHistoryItem(item)}
                />
              </View>
            </View>
          ))}
        </View>
      )}
      </ScrollView>
      <ScrollTopFab
        visible={showScrollTop}
        backgroundColor={palette.primary}
        onPress={scrollToTop}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  subtitle: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
  },
  searchInputWrap: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearQueryButton: {
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statsCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 96,
    flexGrow: 1,
  },
  statsValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  statsLabel: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  lastUpdatedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionsRow: {
    marginTop: 2,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  bannerText: {
    marginTop: 4,
  },
  emptyActionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  cardsWrap: {
    gap: 12,
  },
  cardsWrapWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  cardWide: {
    width: '49%',
  },
  poster: {
    width: '100%',
    height: 180,
    borderRadius: 10,
  },
  posterFallback: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardBody: {
    gap: 4,
  },
  badge: {
    alignSelf: 'flex-start',
    color: '#ffffff',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  cardMeta: {
    fontSize: 12,
  },
  openButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
});
