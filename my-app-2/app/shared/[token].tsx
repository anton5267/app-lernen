import { Stack, router, useLocalSearchParams } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ScrollTopFab } from '@/components/common/ScrollTopFab';
import { StatusBanner, StatusBannerState } from '@/components/common/StatusBanner';
import { useAppContext } from '@/context/AppContext';
import { useScrollTop } from '@/hooks/useScrollTop';
import { getPublicSharedCollection, importFavoritesCollection } from '@/services/movieApi';
import { getThemeTokens } from '@/theme/tokens';
import { PublicSharedCollectionPayload } from '@/types/api';

type SortMode = 'recent' | 'rating-desc' | 'title-asc';

export default function SharedCollectionScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 980;
  const { scrollRef, showScrollTop, onScroll, scrollToTop } = useScrollTop(520);
  const { token } = useLocalSearchParams<{ token: string }>();
  const { resolvedTheme, isAuthenticated, refreshFavorites } = useAppContext();
  const [payload, setPayload] = useState<PublicSharedCollectionPayload | null>(null);
  const [banner, setBanner] = useState<StatusBannerState>(null);
  const [query, setQuery] = useState('');
  const [onlyWatched, setOnlyWatched] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [posterLoadFailedByKey, setPosterLoadFailedByKey] = useState<Record<string, true>>({});

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
      error: theme.colors.danger,
      success: theme.colors.success,
      warning: theme.colors.warning,
      info: theme.colors.info,
    };
  }, [resolvedTheme]);

  const filteredItems = useMemo(() => {
    if (!payload) {
      return [];
    }

    const q = query.trim().toLowerCase();
    const result = payload.items.filter((item) => {
      if (onlyWatched && !item.watched) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        item.title.toLowerCase().includes(q) ||
        String(item.year ?? '').includes(q) ||
        item.mediaType.toLowerCase().includes(q)
      );
    });

    if (sortMode === 'rating-desc') {
      result.sort((a, b) => (b.personalRating ?? b.rating ?? 0) - (a.personalRating ?? a.rating ?? 0));
    } else if (sortMode === 'title-asc') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'uk'));
    }

    return result;
  }, [onlyWatched, payload, query, sortMode]);

  const loadSharedCollection = useCallback(async (signal?: AbortSignal) => {
    if (!token) {
      setError('Невірне share-посилання.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getPublicSharedCollection(token, signal);
      setPayload(result);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : 'Помилка завантаження колекції';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const abortController = new AbortController();
    loadSharedCollection(abortController.signal).catch(() => {
      // already handled in loader
    });
    return () => abortController.abort();
  }, [loadSharedCollection]);

  useEffect(() => {
    setPosterLoadFailedByKey({});
  }, [payload?.share.id, payload?.items.length]);

  const markPosterLoadFailed = useCallback((itemKey: string) => {
    setPosterLoadFailedByKey((prev) => {
      if (prev[itemKey]) {
        return prev;
      }
      return { ...prev, [itemKey]: true };
    });
  }, []);

  const handleImportSharedCollection = async () => {
    if (!payload) {
      return;
    }
    if (!isAuthenticated) {
      router.push('/auth');
      return;
    }

    setImporting(true);
    try {
      const response = await importFavoritesCollection(
        payload.items.map((item) => ({
          mediaType: item.mediaType,
          tmdbId: item.tmdbId,
          title: item.title,
          poster: item.poster,
          rating: item.rating,
          year: item.year,
          watched: item.watched,
          personalRating: item.personalRating,
        })),
        'merge'
      );
      await refreshFavorites();
      setBanner({ type: 'success', message: `Імпорт виконано: +${response.imported}, пропущено ${response.skipped}.` });
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : 'Помилка імпорту';
      setBanner({ type: 'error', message });
    } finally {
      setImporting(false);
    }
  };

  const openSharedItemDetails = (mediaType: 'movie' | 'tv', tmdbId: number) => {
    if (mediaType === 'movie') {
      router.push(`/movie/${tmdbId}` as never);
      return;
    }
    router.push(`/tv/${tmdbId}` as never);
  };

  const handlePullRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadSharedCollection();
      setBanner({ type: 'info', message: 'Публічну колекцію оновлено.' });
    } finally {
      setRefreshing(false);
    }
  }, [loadSharedCollection]);

  return (
    <>
      <Stack.Screen options={{ title: payload?.share.title ?? 'Публічна колекція' }} />
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
        <View style={[styles.panel, { backgroundColor: palette.panelBg, borderColor: palette.border }]}>
          <Text style={[styles.title, { color: palette.textMain }]}>
            {payload?.share.title ?? 'Публічна колекція'}
          </Text>
          {payload ? (
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>
              Власник: {payload.share.ownerName} • {payload.items.length} елемент(ів) • Після фільтрів: {filteredItems.length}
            </Text>
          ) : null}
          {payload?.share.expiresAt ? (
            <Text style={[styles.subtitle, { color: palette.textMuted }]}>
              Діє до: {new Date(payload.share.expiresAt).toLocaleString('uk-UA')}
            </Text>
          ) : (
            payload ? <Text style={[styles.subtitle, { color: palette.textMuted }]}>Посилання безстрокове</Text> : null
          )}

          {payload ? (
            <View style={styles.filtersWrap}>
              <TextInput
                style={[styles.searchInput, { backgroundColor: palette.cardBg, borderColor: palette.border, color: palette.textMain }]}
                value={query}
                onChangeText={setQuery}
                placeholder="Пошук по shared-колекції"
                placeholderTextColor={palette.textMuted}
              />
              <View style={styles.row}>
                <Pressable
                  style={[styles.filterButton, { backgroundColor: onlyWatched ? palette.primary : palette.cardBg }]}
                  onPress={() => setOnlyWatched((prev) => !prev)}>
                  <Text style={styles.filterButtonText}>{onlyWatched ? 'Лише переглянуті' : 'Усі'}</Text>
                </Pressable>
                <Pressable
                  style={[styles.filterButton, { backgroundColor: sortMode === 'recent' ? palette.primary : palette.cardBg }]}
                  onPress={() => setSortMode('recent')}>
                  <Text style={styles.filterButtonText}>Нові</Text>
                </Pressable>
                <Pressable
                  style={[styles.filterButton, { backgroundColor: sortMode === 'rating-desc' ? palette.primary : palette.cardBg }]}
                  onPress={() => setSortMode('rating-desc')}>
                  <Text style={styles.filterButtonText}>Рейтинг</Text>
                </Pressable>
                <Pressable
                  style={[styles.filterButton, { backgroundColor: sortMode === 'title-asc' ? palette.primary : palette.cardBg }]}
                  onPress={() => setSortMode('title-asc')}>
                  <Text style={styles.filterButtonText}>A-Z</Text>
                </Pressable>
              </View>

              <Pressable
                style={[styles.importButton, { backgroundColor: isAuthenticated ? palette.primary : '#0f766e' }]}
                onPress={handleImportSharedCollection}
                disabled={importing}>
                <Text style={styles.importButtonText}>
                  {isAuthenticated
                    ? importing
                      ? 'Імпорт...'
                      : 'Імпортувати колекцію собі'
                    : 'Увійти і імпортувати'}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <StatusBanner
            banner={banner}
            errorColor={palette.error}
            successColor={palette.success}
            infoColor={palette.textMain}
            containerStyle={styles.banner}
          />
        </View>

        {loading ? <ActivityIndicator size="large" color={palette.primary} /> : null}
        {error ? <Text style={[styles.errorText, { color: palette.error }]}>{error}</Text> : null}

        {filteredItems.length === 0 && payload && !loading && !error ? (
          <View style={[styles.emptyState, { backgroundColor: palette.panelBg, borderColor: palette.border }]}>
            <Ionicons name="search-outline" size={18} color={palette.textMuted} />
            <Text style={[styles.movieMeta, { color: palette.textMuted }]}>
              За поточними фільтрами нічого не знайдено у shared-колекції.
            </Text>
          </View>
        ) : null}

        <View style={[styles.cardsWrap, isWide && styles.cardsWrapWide]}>
          {filteredItems.map((item) => {
            const itemKey = `${item.mediaType}:${item.tmdbId}`;
            const hasPoster = Boolean(item.poster) && !posterLoadFailedByKey[itemKey];
            return (
            <View
              key={itemKey}
              style={[styles.card, isWide && styles.cardWide, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
              {hasPoster ? (
                <ExpoImage
                  source={{ uri: item.poster! }}
                  style={styles.poster}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={120}
                  onError={() => markPosterLoadFailed(itemKey)}
                />
              ) : (
                <View style={[styles.posterFallback, { backgroundColor: palette.panelBg, borderColor: palette.border }]}>
                  <Ionicons name="image-outline" size={18} color={palette.textMuted} />
                  <Text style={[styles.posterFallbackText, { color: palette.textMuted }]}>Постер недоступний</Text>
                </View>
              )}
              <View style={styles.badgesRow}>
                <Text style={[styles.badge, { backgroundColor: item.mediaType === 'tv' ? palette.info : palette.primary }]}>
                  {item.mediaType === 'tv' ? 'Серіал' : 'Фільм'}
                </Text>
                <Text style={[styles.badge, { backgroundColor: item.watched ? palette.success : palette.warning }]}>
                  {item.watched ? 'Переглянуто' : 'Заплановано'}
                </Text>
              </View>
              <Text style={[styles.movieTitle, { color: palette.textMain }]} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={[styles.movieMeta, { color: palette.textMuted }]}>
                {item.year ?? '—'} • TMDB: {item.rating ?? '—'} • Мій: {item.personalRating ?? '—'}
              </Text>

              <Pressable
                style={[styles.openButton, { backgroundColor: palette.primary }]}
                onPress={() => openSharedItemDetails(item.mediaType, item.tmdbId)}>
                <Ionicons name="open-outline" size={14} color="#ffffff" />
                <Text style={styles.openButtonText}>Деталі</Text>
              </Pressable>
            </View>
            );
          })}
        </View>
        </ScrollView>
        <ScrollTopFab
          visible={showScrollTop}
          backgroundColor={palette.primary}
          onPress={scrollToTop}
        />
      </View>
    </>
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
  panel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
  },
  filtersWrap: {
    marginTop: 10,
    gap: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  filterButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  importButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  importButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
  },
  banner: {
    marginTop: 8,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardsWrap: {
    gap: 10,
  },
  cardsWrapWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  cardWide: {
    width: '49.2%',
  },
  poster: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  posterFallback: {
    width: '100%',
    height: 180,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  posterFallbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    color: '#ffffff',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  movieTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  movieMeta: {
    fontSize: 13,
  },
  openButton: {
    borderRadius: 9,
    paddingVertical: 9,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  openButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
