import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

import { StatusBanner, StatusBannerState } from '@/components/common/StatusBanner';
import { SkeletonBlock } from '@/components/common/SkeletonBlock';
import { useAppContext } from '@/context/AppContext';
import { trackViewingHistory } from '@/services/movieApi';
import { getThemeTokens } from '@/theme/tokens';
import { MovieDetails } from '@/types/api';

function formatRating(value: number | null) {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${value.toFixed(1)}/10`;
}

function providerTypeLabel(type: MovieDetails['watchProviders']['items'][number]['type']) {
  if (type === 'subscription') {
    return 'Підписка';
  }
  if (type === 'rent') {
    return 'Оренда';
  }
  return 'Купівля';
}

function buildTrailerSearchUrl(title: string, year: string | null | undefined) {
  const trimmedTitle = title.trim();
  if (!trimmedTitle) {
    return null;
  }

  const queryParts = [trimmedTitle, 'official trailer'];
  if (year?.trim()) {
    queryParts.push(year.trim());
  }

  return `https://www.youtube.com/results?search_query=${encodeURIComponent(queryParts.join(' '))}`;
}

type MediaDetailsScreenProps = {
  contentId: number;
  mediaType: 'movie' | 'tv';
  screenFallbackTitle: string;
  invalidIdMessage: string;
  similarSectionTitle: string;
  fetchDetails: (id: number, signal?: AbortSignal) => Promise<MovieDetails>;
};

type DetailsSectionKey = 'trailer' | 'providers' | 'cast' | 'similar';

const DETAILS_SECTION_NAV: { key: DetailsSectionKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'trailer', label: 'Трейлер', icon: 'logo-youtube' },
  { key: 'providers', label: 'Де дивитись', icon: 'tv-outline' },
  { key: 'cast', label: 'Актори', icon: 'people-outline' },
  { key: 'similar', label: 'Схожі', icon: 'sparkles-outline' },
];

export function MediaDetailsScreen({
  contentId,
  mediaType,
  screenFallbackTitle,
  invalidIdMessage,
  similarSectionTitle,
  fetchDetails,
}: MediaDetailsScreenProps) {
  const { width } = useWindowDimensions();
  const { resolvedTheme, addFavoriteFromSearch, deleteFavoriteById, favorites, isAuthenticated, user } = useAppContext();

  const [content, setContent] = useState<MovieDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<StatusBannerState>(null);
  const [showAllCast, setShowAllCast] = useState(false);
  const [showAllSimilar, setShowAllSimilar] = useState(false);
  const [showFullOverview, setShowFullOverview] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [trailerError, setTrailerError] = useState(false);
  const [trailerWebKey, setTrailerWebKey] = useState(0);
  const [backdropLoadFailed, setBackdropLoadFailed] = useState(false);
  const [posterLoadFailed, setPosterLoadFailed] = useState(false);
  const [activeSection, setActiveSection] = useState<DetailsSectionKey>('trailer');
  const scrollRef = useRef<ScrollView>(null);
  const latestLoadRequestIdRef = useRef(0);
  const latestRefreshRequestIdRef = useRef(0);
  const lastTrackedHistoryKeyRef = useRef<string | null>(null);
  const sectionOffsetsRef = useRef<Record<DetailsSectionKey, number>>({
    trailer: 0,
    providers: 0,
    cast: 0,
    similar: 0,
  });
  const isWide = width >= 960;
  const isPhone = width < 768;
  const isSmallPhone = width < 420;

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
      success: theme.colors.success,
      info: theme.colors.info,
      warning: theme.colors.warning,
      error: theme.colors.danger,
    };
  }, [resolvedTheme]);

  const loadContent = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++latestLoadRequestIdRef.current;
      if (!Number.isFinite(contentId)) {
        if (requestId === latestLoadRequestIdRef.current) {
          setError(invalidIdMessage);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const payload = await fetchDetails(contentId, signal);
        if (signal?.aborted || requestId !== latestLoadRequestIdRef.current) {
          return;
        }
        setContent(payload);
        setLastUpdatedAt(new Date().toLocaleTimeString('uk-UA'));
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return;
        }
        if (requestId !== latestLoadRequestIdRef.current) {
          return;
        }
        const message = fetchError instanceof Error ? fetchError.message : 'Помилка завантаження';
        setError(message);
      } finally {
        if (!signal?.aborted && requestId === latestLoadRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [contentId, fetchDetails, invalidIdMessage]
  );

  useEffect(() => {
    if (!Number.isFinite(contentId)) {
      setError(invalidIdMessage);
      return;
    }

    const abortController = new AbortController();
    loadContent(abortController.signal).catch(() => {
      // handled in loadContent
    });

    return () => abortController.abort();
  }, [contentId, invalidIdMessage, loadContent]);

  useEffect(() => {
    if (!isAuthenticated || !content) {
      return;
    }

    const trackingKey = `${user?.id ?? 'unknown'}:${mediaType}:${content.id}`;
    if (trackingKey === lastTrackedHistoryKeyRef.current) {
      return;
    }
    lastTrackedHistoryKeyRef.current = trackingKey;

    trackViewingHistory({
      mediaType,
      contentId: String(content.id),
      title: content.title,
      poster: content.poster,
      rating: content.rating,
      year: content.year,
      externalUrl: null,
      channelTitle: null,
    }).catch(() => {});
  }, [content, isAuthenticated, mediaType, user?.id]);

  const canSeeDebug = __DEV__ || Boolean(user?.isAdmin);
  const isDemoSource = Boolean(content?.sourceMode === 'demo' || content?.demoMode);
  const hasBackdrop = Boolean(content?.backdrop) && !backdropLoadFailed;
  const hasPoster = Boolean(content?.poster) && !posterLoadFailed;
  const providerCount = content?.watchProviders.items.length ?? 0;
  const heroHeight = isWide ? 292 : Math.max(214, Math.min(272, Math.round(width * 0.56)));
  const trailerHeight = isWide ? 332 : Math.max(220, Math.min(292, Math.round(width * 0.58)));
  const posterSize = useMemo(() => {
    const posterWidth = isWide ? 210 : Math.max(142, Math.min(188, Math.round(width * 0.42)));
    return {
      width: posterWidth,
      height: Math.round(posterWidth * 1.5),
    };
  }, [isWide, width]);
  const favoriteRecord = useMemo(() => {
    if (!content) {
      return null;
    }
    return favorites.find((item) => item.mediaType === mediaType && item.tmdbId === content.id) ?? null;
  }, [content, favorites, mediaType]);
  const isInCollection = Boolean(favoriteRecord);
  const visibleCast = useMemo(() => {
    if (!content) {
      return [];
    }
    return showAllCast ? content.cast : content.cast.slice(0, 10);
  }, [content, showAllCast]);
  const visibleSimilar = useMemo(() => {
    if (!content) {
      return [];
    }
    return showAllSimilar ? content.similar : content.similar.slice(0, isWide ? 8 : 4);
  }, [content, isWide, showAllSimilar]);
  const providerGroups = useMemo(() => {
    if (!content) {
      return {
        subscription: [] as MovieDetails['watchProviders']['items'],
        rent: [] as MovieDetails['watchProviders']['items'],
        buy: [] as MovieDetails['watchProviders']['items'],
      };
    }
    return {
      subscription: content.watchProviders.items.filter((item) => item.type === 'subscription'),
      rent: content.watchProviders.items.filter((item) => item.type === 'rent'),
      buy: content.watchProviders.items.filter((item) => item.type === 'buy'),
    };
  }, [content]);
  const overviewRaw = content?.overview?.trim() ?? '';
  const isOverviewLong = overviewRaw.length > 260;
  const overviewText =
    isOverviewLong && !showFullOverview ? `${overviewRaw.slice(0, 260).trimEnd()}...` : overviewRaw || 'Опис відсутній.';
  const trailerFallbackUrl = useMemo(() => {
    if (!content) {
      return null;
    }
    if (content.trailerUrl) {
      return content.trailerUrl;
    }
    return buildTrailerSearchUrl(content.title, content.year);
  }, [content]);
  const trailerFallbackLabel = content?.trailerUrl ? 'Відкрити оригінал на YouTube' : 'Знайти трейлер на YouTube';

  useEffect(() => {
    setShowAllCast(false);
    setShowAllSimilar(false);
    setShowFullOverview(false);
  }, [content?.id, mediaType]);

  useEffect(() => {
    setTrailerWebKey((prev) => prev + 1);
    setTrailerLoading(Boolean(content?.trailerEmbedUrl));
    setTrailerError(false);
  }, [content?.id, content?.trailerEmbedUrl]);

  useEffect(() => {
    setBackdropLoadFailed(false);
    setPosterLoadFailed(false);
  }, [content?.id, content?.backdrop, content?.poster]);

  const openUrl = (url: string, errorMessage: string) => {
    Linking.openURL(url).catch(() => {
      setBanner({ type: 'error', message: errorMessage });
    });
  };

  const handlePullRefresh = async () => {
    if (refreshing) {
      return;
    }
    const refreshId = ++latestRefreshRequestIdRef.current;
    setRefreshing(true);
    try {
      await loadContent();
      if (refreshId === latestRefreshRequestIdRef.current) {
        setBanner({ type: 'info', message: 'Деталі оновлено.' });
      }
    } finally {
      if (refreshId === latestRefreshRequestIdRef.current) {
        setRefreshing(false);
      }
    }
  };

  const openSimilar = (item: MovieDetails['similar'][number]) => {
    if (item.mediaType === 'movie') {
      router.push(`/movie/${item.id}` as never);
      return;
    }
    if (item.mediaType === 'tv') {
      router.push(`/tv/${item.id}` as never);
    }
  };

  const onSectionLayout = (section: DetailsSectionKey) => (event: LayoutChangeEvent) => {
    sectionOffsetsRef.current[section] = event.nativeEvent.layout.y;
  };

  const updateActiveSectionFromScroll = useCallback((scrollY: number) => {
    const marker = scrollY + 120;
    const nextSection: DetailsSectionKey =
      marker >= sectionOffsetsRef.current.similar
        ? 'similar'
        : marker >= sectionOffsetsRef.current.cast
          ? 'cast'
          : marker >= sectionOffsetsRef.current.providers
            ? 'providers'
            : 'trailer';

    setActiveSection((prev) => (prev === nextSection ? prev : nextSection));
  }, []);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      updateActiveSectionFromScroll(event.nativeEvent.contentOffset.y);
    },
    [updateActiveSectionFromScroll]
  );

  const scrollToSection = (section: DetailsSectionKey) => {
    const sectionY = sectionOffsetsRef.current[section];
    scrollRef.current?.scrollTo({
      y: Math.max(sectionY - 84, 0),
      animated: true,
    });
    setActiveSection(section);
  };

  const toggleFavorite = async () => {
    if (!content) {
      return;
    }
    if (!isAuthenticated) {
      setBanner({ type: 'info', message: 'Увійдіть через Google, щоб додавати в улюблені.' });
      return;
    }

    if (favoriteRecord) {
      try {
        await deleteFavoriteById(favoriteRecord.id);
        setBanner({ type: 'success', message: `Прибрано з колекції: ${content.title}` });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не вдалося прибрати з колекції';
        setBanner({ type: 'error', message });
      }
      return;
    }

    const result = await addFavoriteFromSearch({
      id: content.id,
      title: content.title,
      poster: content.poster,
      rating: content.rating,
      year: content.year,
      mediaType,
      externalUrl: null,
      channelTitle: null,
      isLive: false,
    });

    setBanner(result.ok ? { type: 'success', message: result.message } : { type: 'error', message: result.message });
  };

  const ratingText = formatRating(content?.rating ?? null);
  const runtimeText = content?.runtime ? `${content.runtime} хв` : '—';
  const yearText = content?.year ?? '—';

  return (
    <>
      <Stack.Screen options={{ title: content?.title ?? screenFallbackTitle }} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.container, isPhone && styles.containerPhone, { backgroundColor: palette.pageBg }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }>
        {loading && !content ? (
          <View style={[styles.panel, isPhone && styles.panelPhone, { backgroundColor: palette.panelBg, borderColor: palette.border }]}>
            <SkeletonBlock style={styles.skeletonHero} />
            <View style={[styles.primaryContent, isWide && styles.primaryContentWide]}>
              <SkeletonBlock style={[styles.skeletonPoster, { width: posterSize.width, height: posterSize.height }]} />
              <View style={[styles.summary, isWide && styles.summaryWide]}>
                <View style={styles.badgeRow}>
                  <SkeletonBlock style={styles.skeletonBadge} />
                  <SkeletonBlock style={styles.skeletonBadge} />
                </View>
                <SkeletonBlock style={styles.skeletonTitle} />
                <SkeletonBlock style={styles.skeletonLine} />
                <SkeletonBlock style={styles.skeletonLineShort} />
                <View style={styles.statsGrid}>
                  <SkeletonBlock style={styles.skeletonStat} />
                  <SkeletonBlock style={styles.skeletonStat} />
                </View>
                <SkeletonBlock style={styles.skeletonParagraph} />
                <SkeletonBlock style={styles.skeletonParagraph} />
                <View style={styles.actions}>
                  <SkeletonBlock style={styles.skeletonButton} />
                  <SkeletonBlock style={styles.skeletonButton} />
                </View>
              </View>
            </View>
          </View>
        ) : null}
        {error ? (
          <View style={[styles.errorBox, { backgroundColor: palette.cardBg, borderColor: palette.error }]}>
            <View style={styles.errorBoxHeader}>
              <Ionicons name="alert-circle-outline" size={18} color={palette.error} />
              <Text style={[styles.errorTitle, { color: palette.textMain }]}>Не вдалося завантажити деталі</Text>
            </View>
            <Text style={[styles.errorText, { color: palette.textMuted }]}>{error}</Text>
            <View style={styles.errorActions}>
              <Pressable
                style={[styles.button, { backgroundColor: palette.primary }]}
                onPress={() => {
                  loadContent().catch(() => {
                    // non-fatal
                  });
                }}>
                <Ionicons name="refresh-outline" size={16} color="#ffffff" />
                <Text style={styles.buttonText}>Спробувати ще раз</Text>
              </Pressable>
              <Pressable
                style={[styles.button, { backgroundColor: palette.info }]}
                onPress={() => router.replace('/' as never)}>
                <Ionicons name="home-outline" size={16} color="#ffffff" />
                <Text style={styles.buttonText}>На головну</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {content ? (
          <View style={[styles.panel, isPhone && styles.panelPhone, { backgroundColor: palette.panelBg, borderColor: palette.border }]}>
            <View style={[styles.heroWrap, { height: heroHeight }]}>
              {hasBackdrop ? (
                <ExpoImage
                  source={{ uri: content.backdrop! }}
                  style={styles.backdrop}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={180}
                  onError={() => setBackdropLoadFailed(true)}
                />
              ) : (
                <View style={[styles.backdropFallback, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                  <Ionicons name="image-outline" size={20} color={palette.textMuted} />
                  <Text style={[styles.backdropFallbackText, { color: palette.textMuted }]}>
                    Фонове зображення недоступне
                  </Text>
                </View>
              )}
              <View style={styles.heroOverlay} />
            </View>

            <View style={[styles.primaryContent, isWide && styles.primaryContentWide]}>
              <View style={styles.posterWrap}>
                {hasPoster ? (
                  <ExpoImage
                    source={{ uri: content.poster! }}
                    style={[styles.poster, { width: posterSize.width, height: posterSize.height }]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={160}
                    onError={() => setPosterLoadFailed(true)}
                  />
                ) : (
                  <View
                    style={[
                      styles.posterFallback,
                      { width: posterSize.width, height: posterSize.height, backgroundColor: palette.cardBg, borderColor: palette.border },
                    ]}>
                    <Ionicons name="film-outline" size={24} color={palette.textMuted} />
                    <Text style={[styles.posterFallbackText, { color: palette.textMuted }]}>Постер недоступний</Text>
                  </View>
                )}
              </View>

              <View style={[styles.summary, isWide && styles.summaryWide]}>
                <View style={styles.badgeRow}>
                  <Text style={[styles.typeBadge, { backgroundColor: mediaType === 'movie' ? palette.primary : palette.info }]}>
                    {mediaType === 'movie' ? 'Фільм' : 'Серіал'}
                  </Text>
                  {canSeeDebug ? (
                    <Text
                      style={[
                        styles.sourceBadge,
                        {
                          backgroundColor: isDemoSource ? palette.warning : palette.info,
                        },
                      ]}>
                      {isDemoSource ? 'Демо-дані' : 'Реальні дані'}
                    </Text>
                  ) : null}
                </View>

                <Text style={[styles.title, isPhone && styles.titlePhone, { color: palette.textMain }]}>{content.title}</Text>
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  {yearText} • {runtimeText} • {ratingText}
                </Text>
                {lastUpdatedAt ? (
                  <Text style={[styles.metaUpdatedAt, { color: palette.textMuted }]}>Оновлено: {lastUpdatedAt}</Text>
                ) : null}
                <Text style={[styles.meta, { color: palette.textMuted }]}>
                  Жанри: {content.genres.length > 0 ? content.genres.join(', ') : '—'}
                </Text>
                <View style={[styles.statsGrid, isSmallPhone && styles.statsGridSmall]}>
                  <View style={[styles.statCard, isSmallPhone && styles.statCardSmall, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                    <Text style={[styles.statValue, { color: palette.textMain }]}>{ratingText}</Text>
                    <Text style={[styles.statLabel, { color: palette.textMuted }]}>TMDB рейтинг</Text>
                  </View>
                  <View style={[styles.statCard, isSmallPhone && styles.statCardSmall, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                    <Text style={[styles.statValue, { color: palette.textMain }]}>{yearText}</Text>
                    <Text style={[styles.statLabel, { color: palette.textMuted }]}>Рік релізу</Text>
                  </View>
                  <View style={[styles.statCard, isSmallPhone && styles.statCardSmall, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                    <Text style={[styles.statValue, { color: palette.textMain }]}>{runtimeText}</Text>
                    <Text style={[styles.statLabel, { color: palette.textMuted }]}>Тривалість</Text>
                  </View>
                  <View style={[styles.statCard, isSmallPhone && styles.statCardSmall, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                    <Text style={[styles.statValue, { color: palette.textMain }]}>{providerCount || '—'}</Text>
                    <Text style={[styles.statLabel, { color: palette.textMuted }]}>Платформи</Text>
                  </View>
                </View>
                <Text style={[styles.overview, { color: palette.textMain }]}>{overviewText}</Text>
                {isOverviewLong ? (
                  <Pressable
                    style={[styles.moreButton, isSmallPhone && styles.moreButtonFull, styles.overviewMoreButton, { borderColor: palette.border, backgroundColor: palette.cardBg }]}
                    onPress={() => setShowFullOverview((prev) => !prev)}>
                    <Ionicons
                      name={showFullOverview ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={14}
                      color={palette.textMain}
                    />
                    <Text style={[styles.moreButtonText, { color: palette.textMain }]}>
                      {showFullOverview ? 'Згорнути опис' : 'Показати повний опис'}
                    </Text>
                  </Pressable>
                ) : null}

                <View style={[styles.actions, isSmallPhone && styles.actionsStacked]}>
                  <Pressable
                    style={[styles.button, isSmallPhone && styles.buttonFull, { backgroundColor: isInCollection ? palette.success : palette.primary }]}
                    onPress={toggleFavorite}>
                    <Ionicons name={isInCollection ? 'checkmark-circle-outline' : 'heart-outline'} size={16} color="#ffffff" />
                    <Text style={styles.buttonText}>{isInCollection ? 'У колекції' : 'Додати в колекцію'}</Text>
                  </Pressable>
                  {isInCollection ? (
                    <Pressable
                      style={[styles.button, isSmallPhone && styles.buttonFull, { backgroundColor: palette.warning }]}
                      onPress={() => router.push('/explore' as never)}>
                      <Ionicons name="bookmark-outline" size={16} color="#ffffff" />
                      <Text style={styles.buttonText}>Відкрити колекцію</Text>
                    </Pressable>
                  ) : null}
                  {isInCollection ? (
                    <Pressable style={[styles.button, isSmallPhone && styles.buttonFull, { backgroundColor: palette.error }]} onPress={toggleFavorite}>
                      <Ionicons name="trash-outline" size={16} color="#ffffff" />
                      <Text style={styles.buttonText}>Прибрати</Text>
                    </Pressable>
                  ) : null}
                  {trailerFallbackUrl ? (
                    <Pressable
                      style={[styles.button, isSmallPhone && styles.buttonFull, { backgroundColor: palette.info }]}
                      onPress={() => openUrl(trailerFallbackUrl, 'Не вдалося відкрити трейлер')}>
                      <Ionicons name="logo-youtube" size={16} color="#ffffff" />
                      <Text style={styles.buttonText}>{isInCollection ? 'Трейлер' : trailerFallbackLabel}</Text>
                    </Pressable>
                  ) : null}
                  {content.watchProviders.link ? (
                    <Pressable
                      style={[styles.button, isSmallPhone && styles.buttonFull, { backgroundColor: palette.info }]}
                      onPress={() => openUrl(content.watchProviders.link!, 'Не вдалося відкрити сторінку платформ')}>
                      <Ionicons name="play-circle-outline" size={16} color="#ffffff" />
                      <Text style={styles.buttonText}>Де дивитись</Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={[styles.quickNavRow, isSmallPhone && styles.quickNavRowStacked]}>
                  {DETAILS_SECTION_NAV.map((item) => {
                    const active = activeSection === item.key;
                    return (
                      <Pressable
                        key={item.key}
                        style={[
                          styles.quickNavButton,
                          isSmallPhone && styles.quickNavButtonFull,
                          {
                            backgroundColor: active ? palette.primary : palette.cardBg,
                            borderColor: active ? palette.primary : palette.border,
                          },
                        ]}
                        onPress={() => scrollToSection(item.key)}>
                        <Ionicons name={item.icon} size={14} color={active ? '#ffffff' : palette.textMain} />
                        <Text style={[styles.quickNavButtonText, { color: active ? '#ffffff' : palette.textMain }]}>
                          {item.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            <View style={[styles.section, { borderColor: palette.border }]} onLayout={onSectionLayout('trailer')}> 
              <View style={styles.sectionTitleRow}>
                <Ionicons name="logo-youtube" size={18} color={palette.textMain} />
                <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Трейлер</Text>
              </View>
              {content.trailerEmbedUrl ? (
                <View style={[styles.trailerWrap, { height: trailerHeight }]}>
                  <WebView
                    key={trailerWebKey}
                    source={{ uri: content.trailerEmbedUrl }}
                    style={styles.trailerWebview}
                    allowsFullscreenVideo
                    mediaPlaybackRequiresUserAction={Platform.OS !== 'web'}
                    onLoadStart={() => {
                      setTrailerLoading(true);
                      setTrailerError(false);
                    }}
                    onLoadEnd={() => {
                      setTrailerLoading(false);
                    }}
                    onError={() => {
                      setTrailerLoading(false);
                      setTrailerError(true);
                    }}
                    onHttpError={() => {
                      setTrailerLoading(false);
                      setTrailerError(true);
                    }}
                  />
                  {trailerLoading ? (
                    <View style={styles.trailerOverlay}>
                      <ActivityIndicator size="small" color={palette.primary} />
                      <Text style={[styles.trailerOverlayText, { color: palette.textMuted }]}>Завантаження трейлера...</Text>
                    </View>
                  ) : null}
                  {trailerError ? (
                    <View style={[styles.trailerOverlay, { backgroundColor: '#0b0f18e8' }]}>
                      <Ionicons name="warning-outline" size={18} color={palette.textMuted} />
                      <Text style={[styles.trailerOverlayText, { color: palette.textMuted }]}>
                        Не вдалося завантажити вбудований трейлер.
                      </Text>
                      <View style={styles.trailerOverlayActions}>
                        <Pressable
                          style={[styles.button, { backgroundColor: palette.info }]}
                          onPress={() => {
                            setTrailerError(false);
                            setTrailerLoading(true);
                            setTrailerWebKey((prev) => prev + 1);
                          }}>
                          <Ionicons name="refresh-outline" size={16} color="#ffffff" />
                          <Text style={styles.buttonText}>Спробувати ще раз</Text>
                        </Pressable>
                        {trailerFallbackUrl ? (
                          <Pressable
                            style={[styles.button, { backgroundColor: palette.primary }]}
                            onPress={() => openUrl(trailerFallbackUrl, 'Не вдалося відкрити трейлер')}>
                            <Ionicons name="open-outline" size={16} color="#ffffff" />
                            <Text style={styles.buttonText}>{trailerFallbackLabel}</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={[styles.emptyBox, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                  <Ionicons name="film-outline" size={18} color={palette.textMuted} />
                  <Text style={[styles.emptyText, { color: palette.textMuted }]}>Трейлер недоступний для цього контенту.</Text>
                  {trailerFallbackUrl ? (
                    <Pressable
                      style={[styles.button, styles.inlineActionButton, { backgroundColor: palette.info }]}
                      onPress={() => openUrl(trailerFallbackUrl, 'Не вдалося відкрити трейлер')}>
                      <Ionicons name="logo-youtube" size={16} color="#ffffff" />
                      <Text style={styles.buttonText}>{trailerFallbackLabel}</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>

            <View style={[styles.section, { borderColor: palette.border }]} onLayout={onSectionLayout('providers')}> 
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="tv-outline" size={18} color={palette.textMain} />
                  <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Де дивитись</Text>
                </View>
                <Text style={[styles.sectionCounter, { color: palette.textMuted }]}>
                  {providerCount} провайдер(ів)
                </Text>
              </View>
              <Text style={[styles.sectionMeta, { color: palette.textMuted }]}>Регіон: {content.watchProviders.region ?? 'н/д'}</Text>
              {isDemoSource ? (
                <Text style={[styles.sectionMeta, { color: palette.textMuted }]}>
                  Демо-дані провайдерів. Додайте TMDB API ключ для реальних платформ.
                </Text>
              ) : content.watchProviders.items.length === 0 ? (
                <Text style={[styles.sectionMeta, { color: palette.textMuted }]}>Платформи не знайдено для цього регіону.</Text>
              ) : (
                <View style={styles.providerGroups}>
                  {(['subscription', 'rent', 'buy'] as const).map((groupType) => {
                    const items = providerGroups[groupType];
                    if (items.length === 0) {
                      return null;
                    }
                    return (
                      <View key={groupType} style={styles.providerGroup}>
                        <Text style={[styles.providerGroupTitle, { color: palette.textMain }]}>
                          {providerTypeLabel(groupType)}
                        </Text>
                        <View style={styles.providersList}>
                          {items.map((provider) => (
                            <View
                              key={`${provider.providerId}:${provider.type}`}
                              style={[styles.providerChip, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                              {provider.logo ? (
                                <ExpoImage
                                  source={{ uri: provider.logo }}
                                  style={styles.providerLogo}
                                  contentFit="cover"
                                  cachePolicy="memory-disk"
                                  transition={120}
                                />
                              ) : null}
                              <View style={styles.providerTextWrap}>
                                <Text style={[styles.providerName, { color: palette.textMain }]}>{provider.providerName}</Text>
                                <Text style={[styles.providerType, { color: palette.textMuted }]}>
                                  {providerTypeLabel(provider.type)}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {content.watchProviders.link ? (
                <Pressable
                  style={[styles.button, { backgroundColor: palette.info }]}
                  onPress={() => openUrl(content.watchProviders.link!, 'Не вдалося відкрити сторінку провайдерів')}>
                  <Ionicons name="open-outline" size={16} color="#ffffff" />
                  <Text style={styles.buttonText}>Відкрити сторінку платформ</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={[styles.section, { borderColor: palette.border }]} onLayout={onSectionLayout('cast')}> 
              <View style={styles.sectionTitleRow}>
                <Ionicons name="people-outline" size={18} color={palette.textMain} />
                <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Акторський склад</Text>
                <Text style={[styles.sectionCounter, { color: palette.textMuted }]}>{content.cast.length}</Text>
              </View>
              {content.cast.length === 0 ? (
                <Text style={[styles.sectionMeta, { color: palette.textMuted }]}>Немає даних про акторів.</Text>
              ) : (
                <View style={styles.castSection}>
                  <View style={styles.castList}>
                    {visibleCast.map((member) => (
                      <View key={member.id} style={[styles.castChip, isSmallPhone && styles.castChipNarrow, { backgroundColor: palette.cardBg }]}> 
                        {member.profile ? (
                          <ExpoImage
                            source={{ uri: member.profile }}
                            style={styles.castAvatar}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={120}
                          />
                        ) : (
                          <View style={[styles.castAvatarFallback, { backgroundColor: palette.panelBg }]}>
                            <Ionicons name="person-outline" size={14} color={palette.textMuted} />
                          </View>
                        )}
                        <View style={styles.castTextWrap}>
                          <Text style={[styles.castName, { color: palette.textMain }]} numberOfLines={1}>
                            {member.name}
                          </Text>
                          <Text style={[styles.castRole, { color: palette.textMuted }]} numberOfLines={1}>
                            {member.character ?? '—'}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                  {content.cast.length > visibleCast.length ? (
                    <Pressable
                      style={[styles.moreButton, isSmallPhone && styles.moreButtonFull, { borderColor: palette.border, backgroundColor: palette.cardBg }]}
                      onPress={() => setShowAllCast(true)}>
                      <Ionicons name="chevron-down-outline" size={14} color={palette.textMain} />
                      <Text style={[styles.moreButtonText, { color: palette.textMain }]}>
                        Показати всіх акторів ({content.cast.length})
                      </Text>
                    </Pressable>
                  ) : content.cast.length > 10 ? (
                    <Pressable
                      style={[styles.moreButton, isSmallPhone && styles.moreButtonFull, { borderColor: palette.border, backgroundColor: palette.cardBg }]}
                      onPress={() => setShowAllCast(false)}>
                      <Ionicons name="chevron-up-outline" size={14} color={palette.textMain} />
                      <Text style={[styles.moreButtonText, { color: palette.textMain }]}>Показати менше</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>

            <View style={[styles.section, { borderColor: palette.border }]} onLayout={onSectionLayout('similar')}> 
              <View style={styles.sectionTitleRow}>
                <Ionicons name="sparkles-outline" size={18} color={palette.textMain} />
                <Text style={[styles.sectionTitle, { color: palette.textMain }]}>{similarSectionTitle}</Text>
                <Text style={[styles.sectionCounter, { color: palette.textMuted }]}>{content.similar.length}</Text>
              </View>
              {content.similar.length === 0 ? (
                <Text style={[styles.sectionMeta, { color: palette.textMuted }]}>Немає рекомендацій.</Text>
              ) : (
                <View style={styles.similarSection}>
                  <View style={styles.similarList}>
                    {visibleSimilar.map((item) => (
                      <Pressable
                        key={`${item.mediaType}:${item.id}`}
                        style={[
                          styles.similarCard,
                          isWide ? styles.similarCardWide : styles.similarCardNarrow,
                          { backgroundColor: palette.cardBg, borderColor: palette.border },
                        ]}
                        onPress={() => openSimilar(item)}>
                        {item.poster ? (
                          <ExpoImage
                            source={{ uri: item.poster }}
                            style={styles.similarPoster}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={120}
                          />
                        ) : (
                          <View style={[styles.similarPosterFallback, { backgroundColor: palette.panelBg }]}>
                            <Ionicons name="image-outline" size={14} color={palette.textMuted} />
                          </View>
                        )}
                        <View style={styles.similarTextWrap}>
                          <Text style={[styles.similarTitle, { color: palette.textMain }]} numberOfLines={2}>
                            {item.title}
                          </Text>
                          <Text style={[styles.similarMeta, { color: palette.textMuted }]}>
                            {item.year ?? '—'} • {formatRating(item.rating)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                  {content.similar.length > visibleSimilar.length ? (
                    <Pressable
                      style={[styles.moreButton, isSmallPhone && styles.moreButtonFull, { borderColor: palette.border, backgroundColor: palette.cardBg }]}
                      onPress={() => setShowAllSimilar(true)}>
                      <Ionicons name="chevron-down-outline" size={14} color={palette.textMain} />
                      <Text style={[styles.moreButtonText, { color: palette.textMain }]}>
                        Показати більше ({content.similar.length})
                      </Text>
                    </Pressable>
                  ) : content.similar.length > (isWide ? 8 : 4) ? (
                    <Pressable
                      style={[styles.moreButton, isSmallPhone && styles.moreButtonFull, { borderColor: palette.border, backgroundColor: palette.cardBg }]}
                      onPress={() => setShowAllSimilar(false)}>
                      <Ionicons name="chevron-up-outline" size={14} color={palette.textMain} />
                      <Text style={[styles.moreButtonText, { color: palette.textMain }]}>Показати менше</Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </View>

            <StatusBanner
              banner={banner}
              errorColor={palette.error}
              successColor={palette.success}
              infoColor={palette.textMain}
              containerStyle={styles.banner}
            />
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
  },
  containerPhone: {
    padding: 12,
  },
  panel: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  panelPhone: {
    borderRadius: 12,
    padding: 10,
  },
  skeletonHero: {
    width: '100%',
    height: 220,
    borderRadius: 14,
  },
  skeletonPoster: {
    borderRadius: 12,
  },
  skeletonBadge: {
    width: 88,
    height: 20,
    borderRadius: 999,
  },
  skeletonTitle: {
    width: '86%',
    height: 32,
    borderRadius: 10,
  },
  skeletonLine: {
    width: '92%',
    height: 16,
    borderRadius: 8,
  },
  skeletonLineShort: {
    width: '62%',
    height: 16,
    borderRadius: 8,
  },
  skeletonStat: {
    flex: 1,
    minWidth: 115,
    height: 54,
    borderRadius: 10,
  },
  skeletonParagraph: {
    width: '100%',
    height: 18,
    borderRadius: 8,
  },
  skeletonButton: {
    width: 160,
    height: 38,
    borderRadius: 10,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 10,
  },
  errorBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroWrap: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    overflow: 'hidden',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 12, 18, 0.26)',
  },
  backdrop: {
    width: '100%',
    height: '100%',
  },
  backdropFallback: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backdropFallbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  primaryContent: {
    gap: 12,
  },
  primaryContentWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  posterWrap: {
    alignItems: 'center',
  },
  poster: {
    width: 180,
    height: 270,
    borderRadius: 12,
    marginTop: -28,
    borderWidth: 2,
    borderColor: '#ffffff33',
  },
  posterFallback: {
    width: 180,
    height: 270,
    borderRadius: 12,
    marginTop: -28,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  posterFallbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  summary: {
    gap: 6,
  },
  summaryWide: {
    flex: 1,
    paddingTop: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    color: '#ffffff',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  sourceBadge: {
    alignSelf: 'flex-start',
    color: '#ffffff',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  titlePhone: {
    fontSize: 24,
  },
  meta: {
    marginTop: 2,
    fontSize: 14,
  },
  metaUpdatedAt: {
    marginTop: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  overview: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
  },
  statsGrid: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statsGridSmall: {
    gap: 6,
  },
  statCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 115,
    flexGrow: 1,
  },
  statCardSmall: {
    minWidth: 0,
    width: '48.5%',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionsStacked: {
    flexDirection: 'column',
  },
  quickNavRow: {
    marginTop: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickNavRowStacked: {
    flexDirection: 'column',
  },
  quickNavButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickNavButtonFull: {
    width: '100%',
  },
  quickNavButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  buttonFull: {
    width: '100%',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  section: {
    marginTop: 6,
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  sectionCounter: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionMeta: {
    fontSize: 13,
  },
  providersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  providerGroups: {
    gap: 8,
  },
  providerGroup: {
    gap: 6,
  },
  providerGroupTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  providerChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  providerLogo: {
    width: 24,
    height: 24,
    borderRadius: 999,
  },
  providerTextWrap: {
    gap: 1,
  },
  providerName: {
    fontWeight: '700',
    fontSize: 12,
  },
  providerType: {
    fontSize: 11,
    fontWeight: '600',
  },
  castList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  castSection: {
    gap: 8,
  },
  castChip: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 165,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  castChipNarrow: {
    minWidth: 0,
    width: '100%',
  },
  castAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  castAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  castTextWrap: {
    flex: 1,
    gap: 1,
  },
  castName: {
    fontWeight: '700',
    fontSize: 12,
  },
  castRole: {
    fontSize: 11,
  },
  similarList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  similarSection: {
    gap: 8,
  },
  similarCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  similarCardWide: {
    width: '49%',
  },
  similarCardNarrow: {
    width: '100%',
  },
  similarPoster: {
    width: 54,
    height: 78,
    borderRadius: 8,
  },
  similarPosterFallback: {
    width: 54,
    height: 78,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  similarTextWrap: {
    flex: 1,
    gap: 2,
  },
  similarTitle: {
    fontWeight: '700',
    fontSize: 13,
  },
  similarMeta: {
    fontSize: 12,
  },
  moreButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  moreButtonFull: {
    width: '100%',
    justifyContent: 'center',
  },
  overviewMoreButton: {
    marginTop: 2,
  },
  moreButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },
  banner: {
    marginTop: 8,
  },
  trailerWrap: {
    height: 240,
    borderRadius: 12,
    overflow: 'hidden',
  },
  trailerWebview: {
    flex: 1,
  },
  trailerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#0b0f1860',
  },
  trailerOverlayText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  trailerOverlayActions: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  emptyBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  emptyText: {
    fontSize: 13,
    flex: 1,
  },
  inlineActionButton: {
    marginLeft: 'auto',
  },
});
