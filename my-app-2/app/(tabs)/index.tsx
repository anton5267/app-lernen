import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { StatusBanner, StatusBannerState } from '@/components/common/StatusBanner';
import { ScrollTopFab } from '@/components/common/ScrollTopFab';
import { DataStateBanner } from '@/components/search/DataStateBanner';
import { SearchResultCard } from '@/components/search/SearchResultCard';
import { SearchResultSkeleton } from '@/components/search/SearchResultSkeleton';
import { ThemeModePicker } from '@/components/settings/ThemeModePicker';
import { useAppContext } from '@/context/AppContext';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useScrollTop } from '@/hooks/useScrollTop';
import { historyMediaTypeLabel } from '@/features/history/utils';
import {
  EMPTY_RECENT_QUERIES,
  SEARCH_RECENT_QUERIES_KEY,
  RecentQueriesByType,
  parseRecentQueriesPayload,
  resetRecentQueriesForType,
  upsertRecentQuery,
} from '@/features/search/recentQueries';
import {
  SearchSortMode,
  applySearchFilters,
  buildEmptyStateText,
  resolveSourceMode,
  shouldFetchExternalEmptyQuery,
  sortModeLabel,
} from '@/features/search/utils';
import {
  CatalogCategory,
  CatalogSort,
  WatchTypeFilter,
  clearAdminCache,
  clearClientReadCache,
  getBackendConfigStatus,
  getAdminCacheStats,
  getCatalogBrowse,
  getCatalogGenres,
  getTrendingMovies,
  getViewingHistory,
  searchMovies,
} from '@/services/movieApi';
import { getThemeTokens } from '@/theme/tokens';
import {
  AdminCacheClearSource,
  AdminCacheStatsResponse,
  BackendConfigStatus,
  GenreOption,
  SearchContentType,
  SearchMovie,
  SearchResponse,
  ViewingHistoryItem,
} from '@/types/api';

const SEARCH_TYPE_OPTIONS: { value: SearchContentType; label: string }[] = [
  { value: 'movie', label: 'Фільми' },
  { value: 'tv', label: 'Серіали' },
  { value: 'multi', label: 'Мікс TMDB' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitch', label: 'Twitch' },
];

const QUICK_QUERY_SUGGESTIONS: Record<SearchContentType, string[]> = {
  movie: ['Dune', 'Interstellar', 'The Batman', 'Top Gun'],
  tv: ['Breaking Bad', 'The Last of Us', 'Dark', 'Arcane'],
  multi: ['Christopher Nolan', 'Batman', 'Sci-Fi', 'Marvel'],
  youtube: ['movie trailers 2026', 'interstellar trailer', 'top sci fi movies', 'cinema news'],
  twitch: ['valorant', 'just chatting', 'counter-strike', 'fortnite'],
};

const SEARCH_TYPE_ICONS: Record<SearchContentType, keyof typeof Ionicons.glyphMap> = {
  movie: 'film-outline',
  tv: 'tv-outline',
  multi: 'sparkles-outline',
  youtube: 'logo-youtube',
  twitch: 'logo-twitch',
};

const MOVIE_CATEGORY_OPTIONS: { value: CatalogCategory; label: string }[] = [
  { value: 'popular', label: 'Популярні' },
  { value: 'now_playing', label: 'У кіно' },
  { value: 'upcoming', label: 'Скоро' },
  { value: 'top_rated', label: 'Топ рейтингу' },
];

const TV_CATEGORY_OPTIONS: { value: CatalogCategory; label: string }[] = [
  { value: 'popular', label: 'Популярні' },
  { value: 'airing_today', label: 'Сьогодні в ефірі' },
  { value: 'on_the_air', label: 'В ефірі' },
  { value: 'top_rated', label: 'Топ рейтингу' },
];

const MOVIE_SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'popularity.desc', label: 'Популярність' },
  { value: 'primary_release_date.desc', label: 'Дата виходу' },
  { value: 'vote_average.desc', label: 'Рейтинг' },
  { value: 'title.asc', label: 'Назва A-Z' },
];

const TV_SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'popularity.desc', label: 'Популярність' },
  { value: 'first_air_date.desc', label: 'Дата виходу' },
  { value: 'vote_average.desc', label: 'Рейтинг' },
  { value: 'name.asc', label: 'Назва A-Z' },
];

const WATCH_TYPE_OPTIONS: { value: WatchTypeFilter; label: string }[] = [
  { value: 'flatrate', label: 'Стрімінг' },
  { value: 'free', label: 'Безкоштовно' },
  { value: 'ads', label: 'З рекламою' },
  { value: 'rent', label: 'Оренда' },
  { value: 'buy', label: 'Купівля' },
];

type ActiveFilterChipKey =
  | 'poster'
  | 'min-rating'
  | 'year'
  | 'year-range'
  | 'genres'
  | 'watch-types'
  | 'catalog-sort'
  | 'sort';

type ActiveFilterChip = {
  key: ActiveFilterChipKey;
  label: string;
};

const ADMIN_CACHE_ACTIONS: { source: AdminCacheClearSource; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { source: 'tmdb', label: 'Очистити TMDB', icon: 'film-outline' },
  { source: 'external', label: 'Очистити зовнішні API', icon: 'planet-outline' },
  { source: 'all', label: 'Очистити все', icon: 'trash-outline' },
];

function formatCacheSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${Math.round(bytes)} B`;
}

export default function SearchScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1180;
  const isPhone = width < 768;
  const isSmallPhone = width < 420;
  const resultGridMode: 'single' | 'double' | 'triple' = width >= 1400 ? 'triple' : width >= 900 ? 'double' : 'single';
  const { scrollRef, showScrollTop, onScroll, scrollToTop } = useScrollTop(520);

  const {
    resolvedTheme,
    themePreference,
    setThemePreference,
    user,
    isAuthenticated,
    signOut,
    addFavoriteFromSearch,
    favorites,
  } = useAppContext();

  const [queryInput, setQueryInput] = useState('');
  const [minRatingInput, setMinRatingInput] = useState('');
  const [yearInput, setYearInput] = useState('');
  const [yearFromInput, setYearFromInput] = useState('');
  const [yearToInput, setYearToInput] = useState('');
  const [onlyWithPoster, setOnlyWithPoster] = useState(false);
  const [searchType, setSearchType] = useState<SearchContentType>('movie');
  const [catalogCategory, setCatalogCategory] = useState<CatalogCategory>('popular');
  const [catalogSort, setCatalogSort] = useState<CatalogSort>('popularity.desc');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [watchTypes, setWatchTypes] = useState<WatchTypeFilter[]>([]);
  const [availableGenres, setAvailableGenres] = useState<GenreOption[]>([]);
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<SearchMovie[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [sortMode, setSortMode] = useState<SearchSortMode>('relevance');
  const [demoMode, setDemoMode] = useState(false);
  const [searchMeta, setSearchMeta] = useState<SearchResponse['meta'] | null>(null);
  const [configStatus, setConfigStatus] = useState<BackendConfigStatus | null>(null);
  const [adminCacheStats, setAdminCacheStats] = useState<AdminCacheStatsResponse['caches'] | null>(null);
  const [adminCacheLoading, setAdminCacheLoading] = useState(false);
  const [adminCacheAction, setAdminCacheAction] = useState<AdminCacheClearSource | null>(null);
  const [historyItems, setHistoryItems] = useState<ViewingHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<StatusBannerState>(null);
  const [filtersOpen, setFiltersOpen] = useState(isDesktop);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [recentQueries, setRecentQueries] = useState<RecentQueriesByType>({ ...EMPTY_RECENT_QUERIES });
  const [pendingFavoriteKeys, setPendingFavoriteKeys] = useState<Record<string, true>>({});
  const pendingFavoriteKeysRef = useRef<Record<string, true>>({});
  const recentQueriesHydratedRef = useRef(false);
  const queryInputValueRef = useRef('');
  const searchInputRef = useRef<TextInput>(null);
  const latestSearchRequestIdRef = useRef(0);
  const latestRefreshRequestIdRef = useRef(0);
  const resultOpacity = useRef(new Animated.Value(1)).current;
  const resultTranslateY = useRef(new Animated.Value(0)).current;
  const stateBannerOpacity = useRef(new Animated.Value(0)).current;
  const isCatalogType = searchType === 'movie' || searchType === 'tv' || searchType === 'multi';
  const isTmdbCatalogType = searchType === 'movie' || searchType === 'tv';
  const debouncedMinRatingInput = useDebouncedValue(minRatingInput, 320);
  const debouncedYearInput = useDebouncedValue(yearInput, 320);
  const debouncedYearFromInput = useDebouncedValue(yearFromInput, 320);
  const debouncedYearToInput = useDebouncedValue(yearToInput, 320);
  const debouncedQueryInput = useDebouncedValue(queryInput, 450);

  useEffect(() => {
    const normalized = debouncedQueryInput.trim();
    if (normalized === query) {
      return;
    }
    setQuery(normalized);
    setPage(1);
  }, [debouncedQueryInput, query]);

  useEffect(() => {
    queryInputValueRef.current = queryInput;
  }, [queryInput]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const isTextEditingTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      if (!element) {
        return false;
      }
      const tag = element.tagName?.toLowerCase?.() ?? '';
      return tag === 'input' || tag === 'textarea' || Boolean(element.isContentEditable);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (event.key === '/') {
        if (isTextEditingTarget(document.activeElement)) {
          return;
        }
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (event.key === 'Escape') {
        if (!queryInputValueRef.current.trim()) {
          return;
        }
        event.preventDefault();
        setQueryInput('');
        setPage(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const quickQueries = QUICK_QUERY_SUGGESTIONS[searchType];
  const recentQueriesForType = recentQueries[searchType] ?? [];

  const submitQueryNow = useCallback(() => {
    const normalized = queryInput.trim();
    setQuery(normalized);
    setPage(1);
  }, [queryInput]);

  const applyPresetQuery = useCallback((rawValue: string) => {
    const normalized = rawValue.trim();
    setQueryInput(rawValue);
    setQuery(normalized);
    setPage(1);
  }, []);

  const saveRecentQuery = useCallback((type: SearchContentType, rawValue: string) => {
    setRecentQueries((prev) => {
      return upsertRecentQuery(prev, type, rawValue);
    });
  }, []);

  const clearRecentQueriesForType = useCallback((type: SearchContentType) => {
    setRecentQueries((prev) => {
      return resetRecentQueriesForType(prev, type);
    });
  }, []);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(SEARCH_RECENT_QUERIES_KEY)
      .then((raw) => {
        if (!active) {
          return;
        }
        setRecentQueries(parseRecentQueriesPayload(raw));
        recentQueriesHydratedRef.current = true;
      })
      .catch(() => {
        // non-fatal
        if (active) {
          recentQueriesHydratedRef.current = true;
        }
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!recentQueriesHydratedRef.current) {
      return;
    }

    const persistTimer = setTimeout(() => {
      AsyncStorage.setItem(SEARCH_RECENT_QUERIES_KEY, JSON.stringify(recentQueries)).catch(() => {
        // non-fatal
      });
    }, 120);

    return () => clearTimeout(persistTimer);
  }, [recentQueries]);

  useEffect(() => {
    const abortController = new AbortController();
    getBackendConfigStatus(abortController.signal)
      .then((status) => setConfigStatus(status))
      .catch(() => {
        // non-fatal
      });

    return () => abortController.abort();
  }, []);

  useEffect(() => {
    pendingFavoriteKeysRef.current = pendingFavoriteKeys;
  }, [pendingFavoriteKeys]);

  useEffect(() => {
    if (!isTmdbCatalogType) {
      setAvailableGenres([]);
      setSelectedGenres([]);
      setWatchTypes([]);
      setShowAllGenres(false);
      setCatalogCategory('popular');
      setCatalogSort('popularity.desc');
      return;
    }

    if (searchType === 'movie') {
      setCatalogCategory((prev) =>
        prev === 'airing_today' || prev === 'on_the_air' ? 'popular' : prev
      );
      setCatalogSort((prev) => (prev === 'first_air_date.desc' || prev === 'name.asc' ? 'popularity.desc' : prev));
    } else {
      setCatalogCategory((prev) =>
        prev === 'now_playing' || prev === 'upcoming' ? 'popular' : prev
      );
      setCatalogSort((prev) => (prev === 'primary_release_date.desc' || prev === 'title.asc' ? 'popularity.desc' : prev));
    }

    const abortController = new AbortController();
    getCatalogGenres(searchType, abortController.signal)
      .then((payload) => setAvailableGenres(payload.items))
      .catch(() => setAvailableGenres([]));

    return () => abortController.abort();
  }, [isTmdbCatalogType, searchType]);

  useEffect(() => {
    if (!isAuthenticated) {
      setHistoryItems([]);
      return;
    }

    let active = true;
    setHistoryLoading(true);
    getViewingHistory(6)
      .then((itemsPayload) => {
        if (active) {
          setHistoryItems(itemsPayload);
        }
      })
      .catch(() => {
        if (active) {
          setHistoryItems([]);
        }
      })
      .finally(() => {
        if (active) {
          setHistoryLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, user?.id]);

  const applyResponsePayload = useCallback((payload: SearchResponse) => {
    setItems(payload.results);
    setTotalPages(payload.totalPages);
    setTotalResults(payload.totalResults);
    setSearchMeta(payload.meta ?? null);
    const mode = payload.meta?.sourceMode ?? (payload.demoMode ? 'demo' : 'real');
    setDemoMode(mode === 'demo');
  }, []);

  const loadSearchResults = useCallback(
    async (signal?: AbortSignal) => {
      const requestId = ++latestSearchRequestIdRef.current;
      setLoading(true);
      setError(null);

      try {
        let payload: SearchResponse;

        if (query.length === 0 && isTmdbCatalogType) {
          payload = await getCatalogBrowse(
            {
              page,
              type: searchType,
              category: catalogCategory,
              sort: catalogSort,
              minRating: debouncedMinRatingInput,
              yearFrom: debouncedYearFromInput,
              yearTo: debouncedYearToInput,
              genres: selectedGenres,
              watchTypes,
              onlyWithPoster,
            },
            signal
          );
        } else {
          if (query.length > 0) {
            payload = await searchMovies(query, page, searchType, signal);
          } else if (searchType === 'youtube' || searchType === 'twitch') {
            if (shouldFetchExternalEmptyQuery({ searchType, configStatus })) {
              payload = await searchMovies('', page, searchType, signal);
            } else {
              payload = {
                page,
                totalPages: 0,
                totalResults: 0,
                results: [],
                source: searchType,
                searchType,
                meta: {
                  sourceMode: 'real',
                  reason: 'query_required',
                  hint: 'Введіть запит, щоб почати пошук по цьому джерелу.',
                },
              };
            }
          } else {
            payload = await getTrendingMovies(page, searchType === 'tv' ? 'tv' : 'movie', signal);
          }
        }

        if (!signal?.aborted && requestId === latestSearchRequestIdRef.current) {
          applyResponsePayload(payload);
          if (query.length > 0 && page === 1) {
            saveRecentQuery(searchType, query);
          }
          setLastUpdatedAt(new Date().toLocaleTimeString('uk-UA'));
        }
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return;
        }
        if (requestId !== latestSearchRequestIdRef.current) {
          return;
        }
        const message = fetchError instanceof Error ? fetchError.message : 'Помилка пошуку';
        setError(message);
      } finally {
        if (!signal?.aborted && requestId === latestSearchRequestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [
      applyResponsePayload,
      catalogCategory,
      catalogSort,
      debouncedMinRatingInput,
      debouncedYearFromInput,
      debouncedYearToInput,
      isTmdbCatalogType,
      onlyWithPoster,
      page,
      query,
      searchType,
      selectedGenres,
      watchTypes,
      saveRecentQuery,
      configStatus,
    ]
  );

  useEffect(() => {
    const abortController = new AbortController();
    loadSearchResults(abortController.signal).catch(() => {
      // handled inside loadSearchResults
    });
    return () => abortController.abort();
  }, [loadSearchResults]);

  const palette = useMemo(() => {
    const theme = getThemeTokens(resolvedTheme);
    return {
      pageBg: theme.colors.pageBg,
      panelBg: theme.colors.panelBg,
      textMain: theme.colors.textMain,
      textMuted: theme.colors.textMuted,
      border: theme.colors.border,
      inputBg: theme.colors.inputBg,
      activeBg: theme.colors.secondary,
      secondary: theme.colors.secondary,
      inactiveBg: theme.colors.cardBg,
      primaryBtn: theme.colors.primary,
      dangerBtn: theme.colors.danger,
      success: theme.colors.success,
      error: theme.colors.danger,
      live: theme.colors.live,
      info: theme.colors.info,
      warning: theme.colors.warning,
      cardBg: theme.colors.cardBg,
    };
  }, [resolvedTheme]);

  const isProduction = !__DEV__;
  const canSeeDebug = !isProduction || Boolean(user?.isAdmin);
  const isAdminUser = Boolean(isAuthenticated && user?.isAdmin);
  const skeletonCount = resultGridMode === 'triple' ? 6 : resultGridMode === 'double' ? 4 : 3;
  const showCatalogTwoPane = isTmdbCatalogType && query.length === 0 && isDesktop;
  const canCollapseFilters = !showCatalogTwoPane;
  const areFiltersVisible = showCatalogTwoPane || filtersOpen;
  const showCompactQuickFilters = canCollapseFilters && !filtersOpen;

  useEffect(() => {
    if (isDesktop) {
      setFiltersOpen(true);
    }
  }, [isDesktop]);

  useEffect(() => {
    if (!isCatalogType) {
      setMinRatingInput('');
      setYearInput('');
      setYearFromInput('');
      setYearToInput('');
      setOnlyWithPoster(false);
      setSelectedGenres([]);
      setWatchTypes([]);
      if (sortMode !== 'relevance') {
        setSortMode('relevance');
      }
      return;
    }

    if (!isTmdbCatalogType) {
      setYearFromInput('');
      setYearToInput('');
      setSelectedGenres([]);
      setWatchTypes([]);
    }
  }, [isCatalogType, isTmdbCatalogType, sortMode]);

  const sortedItems = useMemo(() => {
    if (isTmdbCatalogType && query.length === 0) {
      if (onlyWithPoster) {
        return items.filter((item) => Boolean(item.poster));
      }
      return items;
    }

    return applySearchFilters({
      items,
      isCatalogType,
      minRatingInput,
      yearInput: debouncedYearInput,
      onlyWithPoster,
      sortMode,
    });
  }, [debouncedYearInput, isCatalogType, isTmdbCatalogType, items, minRatingInput, onlyWithPoster, query.length, sortMode]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((favorite) => `${favorite.mediaType}:${favorite.tmdbId}`)),
    [favorites]
  );

  const activeFilters = useMemo<ActiveFilterChip[]>(() => {
    if (isTmdbCatalogType && query.length === 0) {
      const chips: ActiveFilterChip[] = [];
      if (minRatingInput.trim()) {
        chips.push({ key: 'min-rating', label: `Рейтинг >= ${minRatingInput.trim()}` });
      }
      if (yearFromInput.trim() || yearToInput.trim()) {
        chips.push({ key: 'year-range', label: `Роки: ${yearFromInput.trim() || '...'} - ${yearToInput.trim() || '...'}` });
      }
      if (selectedGenres.length > 0) {
        chips.push({ key: 'genres', label: `Жанри: ${selectedGenres.length}` });
      }
      if (watchTypes.length > 0) {
        chips.push({ key: 'watch-types', label: `Watch: ${watchTypes.length}` });
      }
      if (onlyWithPoster) {
        chips.push({ key: 'poster', label: 'Лише з постером' });
      }
      if (catalogSort !== 'popularity.desc') {
        const label =
          [...MOVIE_SORT_OPTIONS, ...TV_SORT_OPTIONS].find((item) => item.value === catalogSort)?.label ??
          'Кастом';
        chips.push({ key: 'catalog-sort', label: `Сортування: ${label}` });
      }
      return chips;
    }
    const chips: ActiveFilterChip[] = [];
    if (onlyWithPoster) {
      chips.push({ key: 'poster', label: 'Лише з постером' });
    }
    if (isCatalogType && minRatingInput.trim()) {
      chips.push({ key: 'min-rating', label: `Рейтинг >= ${minRatingInput.trim()}` });
    }
    if (isCatalogType && yearInput.trim()) {
      chips.push({ key: 'year', label: `Рік: ${yearInput.trim()}` });
    }
    if (isCatalogType && sortMode !== 'relevance') {
      chips.push({ key: 'sort', label: sortMode === 'rating-desc' ? 'Сорт: рейтинг' : 'Сорт: A-Z' });
    }
    return chips;
  }, [
    catalogSort,
    isCatalogType,
    isTmdbCatalogType,
    minRatingInput,
    onlyWithPoster,
    query.length,
    selectedGenres.length,
    sortMode,
    watchTypes.length,
    yearFromInput,
    yearInput,
    yearToInput,
  ]);

  const resultCardPalette = useMemo(
    () => ({
      cardBg: palette.inputBg,
      border: palette.border,
      textMain: palette.textMain,
      textMuted: palette.textMuted,
      primaryBtn: palette.primaryBtn,
      info: palette.info,
      success: palette.success,
      live: palette.live,
    }),
    [palette]
  );

  const resetFilters = useCallback(() => {
    setMinRatingInput('');
    setYearInput('');
    setYearFromInput('');
    setYearToInput('');
    setOnlyWithPoster(false);
    setSelectedGenres([]);
    setWatchTypes([]);
    setShowAllGenres(false);
    setCatalogSort('popularity.desc');
    setSortMode('relevance');
  }, []);

  const clearActiveFilter = useCallback((key: ActiveFilterChipKey) => {
    if (key === 'poster') {
      setOnlyWithPoster(false);
    } else if (key === 'min-rating') {
      setMinRatingInput('');
    } else if (key === 'year') {
      setYearInput('');
    } else if (key === 'year-range') {
      setYearFromInput('');
      setYearToInput('');
    } else if (key === 'genres') {
      setSelectedGenres([]);
    } else if (key === 'watch-types') {
      setWatchTypes([]);
    } else if (key === 'catalog-sort') {
      setCatalogSort('popularity.desc');
    } else if (key === 'sort') {
      setSortMode('relevance');
    }
    setPage(1);
  }, []);

  const refreshAdminCacheStats = useCallback(
    async (showErrorBanner = false) => {
      if (!isAdminUser) {
        setAdminCacheStats(null);
        return;
      }

      setAdminCacheLoading(true);
      try {
        const response = await getAdminCacheStats();
        setAdminCacheStats(response.caches);
      } catch (error) {
        if (showErrorBanner) {
          const message = error instanceof Error ? error.message : 'Не вдалося завантажити статистику кешу.';
          setBanner({ type: 'error', message });
        }
      } finally {
        setAdminCacheLoading(false);
      }
    },
    [isAdminUser]
  );

  useEffect(() => {
    if (!isAdminUser) {
      setAdminCacheStats(null);
      setAdminCacheLoading(false);
      setAdminCacheAction(null);
      return;
    }

    refreshAdminCacheStats(false).catch(() => {
      // handled inside callback
    });
  }, [isAdminUser, refreshAdminCacheStats]);

  const handleClearAdminCache = useCallback(
    async (source: AdminCacheClearSource) => {
      if (!isAdminUser) {
        return;
      }

      setAdminCacheAction(source);
      try {
        const response = await clearAdminCache(source);
        clearClientReadCache();
        setAdminCacheStats(response.caches);
        setBanner({ type: 'success', message: `Кеш очищено: ${source}` });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Не вдалося очистити кеш';
        setBanner({ type: 'error', message });
      } finally {
        setAdminCacheAction(null);
      }
    },
    [isAdminUser]
  );

  const handlePullRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }
    const refreshId = ++latestRefreshRequestIdRef.current;
    setRefreshing(true);
    try {
      clearClientReadCache();
      await loadSearchResults();
      if (refreshId !== latestRefreshRequestIdRef.current) {
        return;
      }
      try {
        const status = await getBackendConfigStatus();
        if (refreshId === latestRefreshRequestIdRef.current) {
          setConfigStatus(status);
        }
      } catch {
        // non-fatal
      }

      if (isAuthenticated) {
        try {
          const recentHistory = await getViewingHistory(6);
          if (refreshId === latestRefreshRequestIdRef.current) {
            setHistoryItems(recentHistory);
          }
        } catch {
          // non-fatal
        }
      }

      if (isAdminUser) {
        await refreshAdminCacheStats(false);
      }

      if (refreshId === latestRefreshRequestIdRef.current) {
        setBanner({ type: 'info', message: 'Дані оновлено.' });
      }
    } finally {
      if (refreshId === latestRefreshRequestIdRef.current) {
        setRefreshing(false);
      }
    }
  }, [isAdminUser, isAuthenticated, loadSearchResults, refreshAdminCacheStats, refreshing]);

  const onAddToFavorites = useCallback(async (movie: SearchMovie) => {
    if (movie.mediaType !== 'movie' && movie.mediaType !== 'tv') {
      setBanner({ type: 'info', message: 'Додавання в колекцію доступне лише для TMDB фільмів/серіалів.' });
      return;
    }
    if (!isAuthenticated) {
      setBanner({ type: 'info', message: 'Спочатку увійдіть на сторінці авторизації.' });
      return;
    }

    const favoriteKey = `${movie.mediaType}:${String(movie.id)}`;
    if (pendingFavoriteKeysRef.current[favoriteKey]) {
      return;
    }
    pendingFavoriteKeysRef.current = { ...pendingFavoriteKeysRef.current, [favoriteKey]: true };

    setPendingFavoriteKeys((prev) => ({ ...prev, [favoriteKey]: true }));
    const result = await addFavoriteFromSearch(movie);
    setBanner(result.ok ? { type: 'success', message: result.message } : { type: 'error', message: result.message });
    if (pendingFavoriteKeysRef.current[favoriteKey]) {
      const nextRef = { ...pendingFavoriteKeysRef.current };
      delete nextRef[favoriteKey];
      pendingFavoriteKeysRef.current = nextRef;
    }
    setPendingFavoriteKeys((prev) => {
      if (!prev[favoriteKey]) {
        return prev;
      }
      const next = { ...prev };
      delete next[favoriteKey];
      return next;
    });
  }, [addFavoriteFromSearch, isAuthenticated]);

  const onOpenResult = useCallback((item: SearchMovie) => {
    if (item.mediaType === 'movie') {
      router.push(`/movie/${item.id}` as never);
      return;
    }
    if (item.mediaType === 'tv') {
      router.push(`/tv/${item.id}` as never);
      return;
    }

    if (item.mediaType === 'youtube' || item.mediaType === 'twitch') {
      const channelOrId = item.channelTitle ? encodeURIComponent(item.channelTitle) : '';
      router.push(
        `/external?source=${item.mediaType}&id=${encodeURIComponent(String(item.id))}&channel=${channelOrId}` as never
      );
      return;
    }

    setBanner({ type: 'error', message: 'Немає доступної дії для цього контенту.' });
  }, []);

  const onOpenHistoryItem = useCallback((item: ViewingHistoryItem) => {
    if (item.mediaType === 'movie') {
      router.push(`/movie/${item.contentId}` as never);
      return;
    }
    if (item.mediaType === 'tv') {
      router.push(`/tv/${item.contentId}` as never);
      return;
    }

    const channelOrId = item.channelTitle ? encodeURIComponent(item.channelTitle) : '';
    router.push(
      `/external?source=${item.mediaType}&id=${encodeURIComponent(item.contentId)}&channel=${channelOrId}` as never
    );
  }, []);

  const openCollectionTab = useCallback(() => {
    router.push('/explore' as never);
  }, []);

  const emptyStateText = useMemo(() => {
    return buildEmptyStateText({
      loading,
      hasResults: sortedItems.length > 0,
      error,
      reason: searchMeta?.reason,
      hint: searchMeta?.hint,
      hasActiveFilters: activeFilters.length > 0,
    });
  }, [activeFilters.length, error, loading, searchMeta?.hint, searchMeta?.reason, sortedItems.length]);

  const sourceMode = resolveSourceMode({
    searchType,
    searchMeta,
    configStatus,
    demoMode,
  });

  const categoryOptions = searchType === 'tv' ? TV_CATEGORY_OPTIONS : MOVIE_CATEGORY_OPTIONS;
  const catalogSortOptions = searchType === 'tv' ? TV_SORT_OPTIONS : MOVIE_SORT_OPTIONS;
  const visibleGenres = useMemo(
    () => (showAllGenres ? availableGenres : availableGenres.slice(0, 18)),
    [availableGenres, showAllGenres]
  );

  const toggleGenre = useCallback((genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId) ? prev.filter((item) => item !== genreId) : [...prev, genreId]
    );
  }, []);

  const toggleWatchType = useCallback((watchType: WatchTypeFilter) => {
    setWatchTypes((prev) =>
      prev.includes(watchType) ? prev.filter((item) => item !== watchType) : [...prev, watchType]
    );
  }, []);

  useEffect(() => {
    stateBannerOpacity.setValue(0);
    Animated.timing(stateBannerOpacity, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [searchMeta?.hint, searchMeta?.reason, sourceMode, stateBannerOpacity]);

  useEffect(() => {
    if (loading) {
      Animated.parallel([
        Animated.timing(resultOpacity, {
          toValue: 0.35,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(resultTranslateY, {
          toValue: 10,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    resultOpacity.setValue(0);
    resultTranslateY.setValue(12);
    Animated.parallel([
      Animated.timing(resultOpacity, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(resultTranslateY, {
        toValue: 0,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [loading, page, query, resultOpacity, resultTranslateY, searchType, sortedItems.length]);

  return (
    <View style={[styles.screen, { backgroundColor: palette.pageBg }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.container, isPhone && styles.containerPhone, { backgroundColor: palette.pageBg }]}
        stickyHeaderIndices={[1]}
        stickyHeaderHiddenOnScroll={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={palette.primaryBtn}
            colors={[palette.primaryBtn]}
          />
        }>
        <View
          style={[
            styles.panel,
            isPhone && styles.panelPhone,
            styles.stickyPanel,
            { backgroundColor: palette.panelBg, borderColor: palette.border },
          ]}>
        <Text style={[styles.headerTitle, isPhone && styles.headerTitlePhone, { color: palette.textMain }]}>Movie Finder</Text>
        <Text style={[styles.headerText, { color: palette.textMuted }]}>
          Пошук фільмів, серіалів, YouTube і Twitch через backend proxy
        </Text>

        <ThemeModePicker
          value={themePreference}
          onChange={setThemePreference}
          textColor={palette.textMain}
          activeBackground={palette.activeBg}
          inactiveBackground={palette.inactiveBg}
          borderColor={palette.border}
        />

        <View style={[styles.authRow, isSmallPhone && styles.authRowStacked]}>
          <Text style={[styles.authText, { color: palette.textMain }]}>
            {user ? `Користувач: ${user.name}` : 'Не авторизовано'}
          </Text>

          {user ? (
            <Pressable
              style={[styles.authButton, isSmallPhone && styles.authButtonFull, { backgroundColor: palette.warning }]}
              onPress={() => {
                signOut().then(() => setBanner({ type: 'info', message: 'Сесію завершено.' }));
              }}>
              <Ionicons name="log-out-outline" size={16} color="#fff" />
              <Text style={styles.authButtonText}>Вийти</Text>
            </Pressable>
          ) : (
            <Pressable
              style={[styles.authButton, isSmallPhone && styles.authButtonFull, { backgroundColor: palette.primaryBtn }]}
              onPress={() => router.push('/auth')}>
              <Ionicons name="log-in-outline" size={16} color="#fff" />
              <Text style={styles.authButtonText}>Авторизація</Text>
            </Pressable>
          )}
        </View>

        <StatusBanner
          banner={banner}
          errorColor={palette.error}
          successColor={palette.success}
          infoColor={palette.textMain}
          containerStyle={styles.bannerText}
        />

        {isAuthenticated ? (
          <View style={[styles.quickHistoryWrap, { borderColor: palette.border }]}>
            <Text style={[styles.quickHistoryTitle, { color: palette.textMain }]}>Продовжити перегляд</Text>
            {historyLoading ? (
              <Text style={[styles.quickHistoryHint, { color: palette.textMuted }]}>Завантаження історії...</Text>
            ) : historyItems.length === 0 ? (
              <Text style={[styles.quickHistoryHint, { color: palette.textMuted }]}>
                Історія поки порожня. Відкрийте деталі фільму/серіалу або external player.
              </Text>
            ) : (
              <View style={styles.quickHistoryList}>
                {historyItems.map((item) => (
                  <Pressable
                    key={item.id}
                    style={[styles.quickHistoryItem, isSmallPhone && styles.quickHistoryItemNarrow, { backgroundColor: palette.cardBg, borderColor: palette.border }]}
                    onPress={() => onOpenHistoryItem(item)}>
                    <View style={styles.quickHistoryBadgeRow}>
                      <Text style={[styles.quickHistoryBadge, { backgroundColor: palette.primaryBtn }]}>
                        {historyMediaTypeLabel(item.mediaType)}
                      </Text>
                    </View>
                    <Text style={[styles.quickHistoryItemTitle, { color: palette.textMain }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={[styles.quickHistoryItemMeta, { color: palette.textMuted }]} numberOfLines={1}>
                      {item.channelTitle ? item.channelTitle : item.year ?? '—'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </View>

        <View style={[styles.panel, isPhone && styles.panelPhone, { backgroundColor: palette.panelBg, borderColor: palette.border }]}>
        <View style={styles.searchHeaderRow}>
          <Text style={[styles.sectionTitle, { color: palette.textMain }]}>Розширений пошук</Text>
          <View style={[styles.searchHeaderActions, isSmallPhone && styles.searchHeaderActionsStack]}>
            {lastUpdatedAt ? (
              <Text style={[styles.searchRefreshMeta, { color: palette.textMuted }]}>Оновлено: {lastUpdatedAt}</Text>
            ) : null}
            <Pressable
              style={[
                styles.searchRefreshButton,
                { backgroundColor: refreshing || loading ? palette.inactiveBg : palette.info },
              ]}
              disabled={refreshing || loading}
              onPress={handlePullRefresh}>
              <Ionicons name={refreshing || loading ? 'hourglass-outline' : 'refresh-outline'} size={14} color="#ffffff" />
              <Text style={styles.searchRefreshButtonText}>{refreshing || loading ? 'Оновлення...' : 'Оновити'}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.typeRow}>
          {SEARCH_TYPE_OPTIONS.map((option) => (
            <Pressable
              key={option.value}
              style={[
                styles.typeButton,
                isSmallPhone && styles.typeButtonNarrow,
                {
                  backgroundColor: searchType === option.value ? palette.primaryBtn : palette.inactiveBg,
                },
              ]}
              onPress={() => {
                setSearchType(option.value);
                setShowAllGenres(false);
                setPage(1);
              }}>
              <Ionicons name={SEARCH_TYPE_ICONS[option.value]} size={14} color="#ffffff" />
              <Text style={styles.typeButtonText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        {isTmdbCatalogType ? (
          <View style={styles.typeRow}>
            {categoryOptions.map((option) => (
              <Pressable
                key={option.value}
                style={[
                  styles.typeButton,
                  isSmallPhone && styles.typeButtonNarrow,
                  {
                    backgroundColor: catalogCategory === option.value ? palette.secondary : palette.inactiveBg,
                    borderWidth: 1,
                    borderColor: catalogCategory === option.value ? palette.primaryBtn : palette.border,
                  },
                ]}
                onPress={() => {
                  setCatalogCategory(option.value);
                  setPage(1);
                }}>
                <Text style={styles.typeButtonText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={[styles.searchInputWrap, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
          <Ionicons name="search-outline" size={18} color={palette.textMuted} />
          <TextInput
            ref={searchInputRef}
            style={[
              styles.searchInput,
              {
                color: palette.textMain,
              },
            ]}
            placeholder="Введіть назву..."
            placeholderTextColor={palette.textMuted}
            value={queryInput}
            onChangeText={setQueryInput}
            onSubmitEditing={submitQueryNow}
            returnKeyType="search"
          />
          {queryInput.length > 0 ? (
            <Pressable
              style={styles.clearQueryButton}
              onPress={() => {
                setQueryInput('');
                setQuery('');
                setPage(1);
              }}>
              <Ionicons name="close-circle" size={18} color={palette.textMuted} />
            </Pressable>
          ) : null}
        </View>
        {Platform.OS === 'web' ? (
          <Text style={[styles.searchShortcutHint, { color: palette.textMuted }]}>
            Підказка: `/` фокус на пошуку, `Esc` очищення запиту
          </Text>
        ) : null}

        <View style={styles.quickQueryWrap}>
          <Text style={[styles.quickQueryLabel, { color: palette.textMuted }]}>Швидкі запити:</Text>
          <View style={styles.quickQueryRow}>
            {quickQueries.map((suggestion) => (
              <Pressable
                key={`${searchType}:${suggestion}`}
                style={[
                  styles.quickQueryChip,
                  {
                    backgroundColor: palette.cardBg,
                    borderColor:
                      queryInput.trim().toLowerCase() === suggestion.toLowerCase() ? palette.primaryBtn : palette.border,
                  },
                ]}
                onPress={() => applyPresetQuery(suggestion)}>
                <Ionicons name="flash-outline" size={12} color={palette.textMuted} />
                <Text style={[styles.quickQueryChipText, { color: palette.textMain }]}>{suggestion}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {recentQueriesForType.length > 0 ? (
          <View style={styles.quickQueryWrap}>
            <View style={styles.recentQueriesHeader}>
              <Text style={[styles.quickQueryLabel, { color: palette.textMuted }]}>Останні запити:</Text>
              <Pressable
                style={[styles.recentClearButton, { borderColor: palette.border, backgroundColor: palette.cardBg }]}
                onPress={() => clearRecentQueriesForType(searchType)}>
                <Ionicons name="trash-outline" size={12} color={palette.textMuted} />
                <Text style={[styles.recentClearText, { color: palette.textMuted }]}>Очистити</Text>
              </Pressable>
            </View>
            <View style={styles.quickQueryRow}>
              {recentQueriesForType.map((recentQuery) => (
                <Pressable
                  key={`${searchType}:recent:${recentQuery}`}
                  style={[styles.quickQueryChip, { backgroundColor: palette.cardBg, borderColor: palette.border }]}
                  onPress={() => applyPresetQuery(recentQuery)}>
                  <Ionicons name="time-outline" size={12} color={palette.textMuted} />
                  <Text style={[styles.quickQueryChipText, { color: palette.textMain }]}>{recentQuery}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <Animated.View style={{ opacity: stateBannerOpacity }}>
          <DataStateBanner
            mode={sourceMode}
            reason={searchMeta?.reason}
            hint={searchMeta?.hint}
            canSeeDebug={canSeeDebug}
            textColor={palette.textMain}
            mutedColor={palette.textMuted}
            borderColor={palette.border}
            backgroundColor={palette.cardBg}
            warningColor={palette.warning}
            infoColor={palette.info}
          />
        </Animated.View>

        {canSeeDebug && configStatus ? (
          <Text style={[styles.debugText, { color: palette.textMuted }]}>
            TMDB: {configStatus.sources.tmdb.mode} | YouTube: {configStatus.sources.youtube.mode} | Twitch:{' '}
            {configStatus.sources.twitch.mode}
          </Text>
        ) : null}

        {isAdminUser ? (
          <View style={[styles.adminCachePanel, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
            <View style={styles.adminCacheHead}>
              <View style={styles.adminCacheHeadTitleWrap}>
                <Ionicons name="server-outline" size={16} color={palette.textMain} />
                <Text style={[styles.adminCacheTitle, { color: palette.textMain }]}>Керування кешем</Text>
              </View>
              <Pressable
                style={[
                  styles.adminCacheRefreshButton,
                  { backgroundColor: adminCacheLoading ? palette.inactiveBg : palette.info },
                ]}
                disabled={adminCacheLoading || adminCacheAction !== null}
                onPress={() => {
                  refreshAdminCacheStats(true).catch(() => {
                    // handled inside callback
                  });
                }}>
                <Ionicons
                  name={adminCacheLoading ? 'hourglass-outline' : 'refresh-outline'}
                  size={14}
                  color="#ffffff"
                />
                <Text style={styles.adminCacheRefreshText}>
                  {adminCacheLoading ? 'Оновлення...' : 'Оновити статистику'}
                </Text>
              </Pressable>
            </View>

            {adminCacheStats ? (
              <View style={styles.adminCacheStatsRow}>
                {(
                  [
                    { key: 'tmdb', label: 'TMDB' },
                    { key: 'external', label: 'YouTube/Twitch' },
                  ] as const
                ).map((entry) => (
                  <View
                    key={entry.key}
                    style={[styles.adminCacheCard, isPhone && styles.adminCacheCardPhone, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                    <Text style={[styles.adminCacheCardTitle, { color: palette.textMain }]}>{entry.label}</Text>
                    <Text style={[styles.adminCacheCardMeta, { color: palette.textMuted }]}>
                      keys: {adminCacheStats[entry.key].keys} | hits: {adminCacheStats[entry.key].hits} | misses:{' '}
                      {adminCacheStats[entry.key].misses}
                    </Text>
                    <Text style={[styles.adminCacheCardMeta, { color: palette.textMuted }]}>
                      key size: {formatCacheSize(adminCacheStats[entry.key].ksize)} | value size:{' '}
                      {formatCacheSize(adminCacheStats[entry.key].vsize)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.adminCacheHint, { color: palette.textMuted }]}>
                Немає статистики кешу. Натисніть «Оновити статистику».
              </Text>
            )}

            <View style={styles.adminCacheActions}>
              {ADMIN_CACHE_ACTIONS.map((action) => {
                const pending = adminCacheAction === action.source;
                const disabled = adminCacheAction !== null || adminCacheLoading;
                return (
                  <Pressable
                    key={action.source}
                    style={[
                      styles.adminCacheActionButton,
                      {
                        backgroundColor: disabled ? palette.inactiveBg : palette.warning,
                      },
                    ]}
                    disabled={disabled}
                    onPress={() => {
                      handleClearAdminCache(action.source).catch(() => {
                        // handled inside callback
                      });
                    }}>
                    <Ionicons name={pending ? 'hourglass-outline' : action.icon} size={14} color="#ffffff" />
                    <Text style={styles.adminCacheActionText}>{pending ? 'Очищення...' : action.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {canCollapseFilters ? (
          <Pressable
            style={[styles.mobileFiltersToggle, { backgroundColor: palette.inputBg, borderColor: palette.border }]}
            onPress={() => setFiltersOpen((prev) => !prev)}>
            <Ionicons
              name={filtersOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
              size={16}
              color={palette.textMain}
            />
            <Text style={[styles.mobileFiltersToggleText, { color: palette.textMain }]}>
              {filtersOpen ? 'Сховати фільтри' : 'Показати фільтри'}
            </Text>
          </Pressable>
        ) : null}

        {showCompactQuickFilters ? (
          <View style={[styles.compactFiltersWrap, { backgroundColor: palette.inputBg, borderColor: palette.border }]}>
            <Text style={[styles.compactFiltersTitle, { color: palette.textMuted }]}>Швидкі фільтри</Text>
            <View style={styles.compactFiltersRow}>
              <Pressable
                style={[
                  styles.compactFilterChip,
                  { backgroundColor: onlyWithPoster ? palette.primaryBtn : palette.inactiveBg },
                ]}
                onPress={() => {
                  setOnlyWithPoster((prev) => !prev);
                  setPage(1);
                }}>
                <Ionicons name="images-outline" size={14} color="#ffffff" />
                <Text style={styles.compactFilterChipText}>{onlyWithPoster ? 'Лише постери' : 'Усі постери'}</Text>
              </Pressable>

              {isTmdbCatalogType && query.length === 0 ? (
                <>
                  {catalogSortOptions.slice(0, 3).map((option) => (
                    <Pressable
                      key={`quick-sort:${option.value}`}
                      style={[
                        styles.compactFilterChip,
                        { backgroundColor: catalogSort === option.value ? palette.primaryBtn : palette.inactiveBg },
                      ]}
                      onPress={() => {
                        setCatalogSort(option.value);
                        setPage(1);
                      }}>
                      <Ionicons name="swap-vertical-outline" size={14} color="#ffffff" />
                      <Text style={styles.compactFilterChipText}>{option.label}</Text>
                    </Pressable>
                  ))}
                </>
              ) : (
                <>
                  <Pressable
                    style={[
                      styles.compactFilterChip,
                      { backgroundColor: sortMode === 'rating-desc' ? palette.primaryBtn : palette.inactiveBg },
                    ]}
                    onPress={() => setSortMode('rating-desc')}>
                    <Ionicons name="star-outline" size={14} color="#ffffff" />
                    <Text style={styles.compactFilterChipText}>Рейтинг</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.compactFilterChip,
                      { backgroundColor: sortMode === 'title-asc' ? palette.primaryBtn : palette.inactiveBg },
                    ]}
                    onPress={() => setSortMode('title-asc')}>
                    <Ionicons name="text-outline" size={14} color="#ffffff" />
                    <Text style={styles.compactFilterChipText}>A-Z</Text>
                  </Pressable>
                </>
              )}

              {activeFilters.length > 0 ? (
                <Pressable
                  style={[styles.compactFilterChip, { backgroundColor: palette.warning }]}
                  onPress={() => {
                    resetFilters();
                    setPage(1);
                  }}>
                  <Ionicons name="refresh-outline" size={14} color="#ffffff" />
                  <Text style={styles.compactFilterChipText}>Скинути</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={[styles.searchLayout, showCatalogTwoPane && styles.searchLayoutTwoPane]}>
          {areFiltersVisible ? (
            <View
              style={[
                styles.filtersPane,
                showCatalogTwoPane && [
                  styles.filtersPaneWide,
                  { backgroundColor: palette.inputBg, borderColor: palette.border },
                ],
              ]}>
              <View style={styles.advancedFiltersWrap}>
                <Text style={[styles.filtersTitle, { color: palette.textMuted }]}>Фільтри результатів</Text>
                {isTmdbCatalogType ? (
                  <View style={styles.filtersRow}>
                    <TextInput
                      style={[
                        styles.filterInput,
                        {
                          backgroundColor: palette.inputBg,
                          borderColor: palette.border,
                          color: palette.textMain,
                        },
                      ]}
                      placeholder="Мін. рейтинг"
                      placeholderTextColor={palette.textMuted}
                      value={minRatingInput}
                      onChangeText={(value) => {
                        setMinRatingInput(value.slice(0, 4));
                        setPage(1);
                      }}
                      keyboardType="decimal-pad"
                    />
                    <TextInput
                      style={[
                        styles.filterInput,
                        {
                          backgroundColor: palette.inputBg,
                          borderColor: palette.border,
                          color: palette.textMain,
                        },
                      ]}
                      placeholder="Рік від"
                      placeholderTextColor={palette.textMuted}
                      value={yearFromInput}
                      onChangeText={(value) => {
                        setYearFromInput(value.replace(/\D/g, '').slice(0, 4));
                        setPage(1);
                      }}
                      keyboardType="number-pad"
                    />
                    <TextInput
                      style={[
                        styles.filterInput,
                        {
                          backgroundColor: palette.inputBg,
                          borderColor: palette.border,
                          color: palette.textMain,
                        },
                      ]}
                      placeholder="Рік до"
                      placeholderTextColor={palette.textMuted}
                      value={yearToInput}
                      onChangeText={(value) => {
                        setYearToInput(value.replace(/\D/g, '').slice(0, 4));
                        setPage(1);
                      }}
                      keyboardType="number-pad"
                    />
                  </View>
                ) : isCatalogType ? (
                  <View style={styles.filtersRow}>
                    <TextInput
                      style={[
                        styles.filterInput,
                        {
                          backgroundColor: palette.inputBg,
                          borderColor: palette.border,
                          color: palette.textMain,
                        },
                      ]}
                      placeholder="Мін. рейтинг"
                      placeholderTextColor={palette.textMuted}
                      value={minRatingInput}
                      onChangeText={(value) => {
                        setMinRatingInput(value.slice(0, 4));
                        setPage(1);
                      }}
                      keyboardType="decimal-pad"
                    />
                    <TextInput
                      style={[
                        styles.filterInput,
                        {
                          backgroundColor: palette.inputBg,
                          borderColor: palette.border,
                          color: palette.textMain,
                        },
                      ]}
                      placeholder="Рік"
                      placeholderTextColor={palette.textMuted}
                      value={yearInput}
                      onChangeText={(value) => {
                        setYearInput(value.replace(/\D/g, '').slice(0, 4));
                        setPage(1);
                      }}
                      keyboardType="number-pad"
                    />
                  </View>
                ) : null}

                <View style={styles.filtersRow}>
                  <Pressable
                    style={[styles.filterToggle, { backgroundColor: onlyWithPoster ? palette.primaryBtn : palette.inactiveBg }]}
                    onPress={() => setOnlyWithPoster((prev) => !prev)}>
                    <Ionicons name="images-outline" size={14} color="#ffffff" />
                    <Text style={styles.filterToggleText}>{onlyWithPoster ? 'Лише з постером' : 'Усі постери'}</Text>
                  </Pressable>
                  {activeFilters.length > 0 ? (
                    <Pressable style={[styles.filterToggle, { backgroundColor: palette.warning }]} onPress={resetFilters}>
                      <Ionicons name="refresh-outline" size={14} color="#ffffff" />
                      <Text style={styles.filterToggleText}>Скинути фільтри</Text>
                    </Pressable>
                  ) : null}
                </View>

                {isTmdbCatalogType ? (
                  <>
                    <View style={styles.filtersRow}>
                      {WATCH_TYPE_OPTIONS.map((option) => {
                        const active = watchTypes.includes(option.value);
                        return (
                          <Pressable
                            key={option.value}
                            style={[
                              styles.filterToggle,
                              { backgroundColor: active ? palette.primaryBtn : palette.inactiveBg, borderWidth: 1, borderColor: palette.border },
                            ]}
                            onPress={() => {
                              toggleWatchType(option.value);
                              setPage(1);
                            }}>
                            <Text style={styles.filterToggleText}>{option.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {availableGenres.length > 0 ? (
                      <View style={styles.activeFiltersWrap}>
                        {visibleGenres.map((genre) => {
                          const active = selectedGenres.includes(genre.id);
                          return (
                            <Pressable
                              key={genre.id}
                              style={[
                                styles.activeFilterChip,
                                {
                                  borderColor: active ? palette.primaryBtn : palette.border,
                                  backgroundColor: active ? palette.secondary : palette.cardBg,
                                },
                              ]}
                              onPress={() => {
                                toggleGenre(genre.id);
                                setPage(1);
                              }}>
                              <Text style={[styles.activeFilterText, { color: palette.textMain }]}>{genre.name}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                    {availableGenres.length > 18 ? (
                      <Pressable
                        style={[styles.showMoreGenresButton, { borderColor: palette.border, backgroundColor: palette.cardBg }]}
                        onPress={() => setShowAllGenres((prev) => !prev)}>
                        <Ionicons
                          name={showAllGenres ? 'chevron-up-outline' : 'chevron-down-outline'}
                          size={14}
                          color={palette.textMain}
                        />
                        <Text style={[styles.showMoreGenresText, { color: palette.textMain }]}>
                          {showAllGenres ? 'Показати менше жанрів' : `Показати всі жанри (${availableGenres.length})`}
                        </Text>
                      </Pressable>
                    ) : null}
                  </>
                ) : null}

                {activeFilters.length > 0 ? (
                  <View style={styles.activeFiltersWrap}>
                    {activeFilters.map((chip) => (
                      <Pressable
                        key={`${chip.key}:${chip.label}`}
                        style={[styles.activeFilterChip, styles.activeFilterChipButton, { borderColor: palette.border, backgroundColor: palette.cardBg }]}
                        onPress={() => clearActiveFilter(chip.key)}>
                        <Text style={[styles.activeFilterText, { color: palette.textMain }]}>{chip.label}</Text>
                        <Ionicons name="close-outline" size={14} color={palette.textMuted} />
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={[styles.resultsPane, showCatalogTwoPane && styles.resultsPaneWide]}>
            <Text style={[styles.resultMeta, { color: palette.textMuted }]}>
              До фільтрів: {totalResults} | Після фільтрів: {sortedItems.length} | Сторінка {Math.max(page, 1)} з{' '}
              {Math.max(totalPages, 1)}
            </Text>
            <Text style={[styles.resultMeta, { color: palette.textMuted }]}>
              Сортування:{' '}
              {isTmdbCatalogType && query.length === 0
                ? catalogSortOptions.find((item) => item.value === catalogSort)?.label ?? 'Популярність'
                : sortModeLabel(sortMode)}
            </Text>

            {loading ? <ActivityIndicator size="small" color={palette.primaryBtn} /> : null}
            {error ? <Text style={[styles.errorText, { color: palette.error }]}>{error}</Text> : null}

            <View style={styles.sortRow}>
              {isTmdbCatalogType && query.length === 0 ? (
                <>
                  {catalogSortOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      style={[
                        styles.sortButton,
                        isSmallPhone && styles.sortButtonNarrow,
                        { backgroundColor: catalogSort === option.value ? palette.primaryBtn : palette.inactiveBg },
                      ]}
                      onPress={() => {
                        setCatalogSort(option.value);
                        setPage(1);
                      }}>
                      <Ionicons name="swap-vertical-outline" size={14} color="#ffffff" />
                      <Text style={styles.sortButtonText}>{option.label}</Text>
                    </Pressable>
                  ))}
                </>
              ) : (
                <>
                  <Pressable
                    style={[
                      styles.sortButton,
                      isSmallPhone && styles.sortButtonNarrow,
                      { backgroundColor: sortMode === 'relevance' ? palette.primaryBtn : palette.inactiveBg },
                    ]}
                    onPress={() => setSortMode('relevance')}>
                    <Ionicons name="sparkles-outline" size={14} color="#ffffff" />
                    <Text style={styles.sortButtonText}>Релевантність</Text>
                  </Pressable>
                  {isCatalogType ? (
                    <>
                      <Pressable
                        style={[
                          styles.sortButton,
                          isSmallPhone && styles.sortButtonNarrow,
                          { backgroundColor: sortMode === 'rating-desc' ? palette.primaryBtn : palette.inactiveBg },
                        ]}
                        onPress={() => setSortMode('rating-desc')}>
                        <Ionicons name="star-outline" size={14} color="#ffffff" />
                        <Text style={styles.sortButtonText}>Рейтинг</Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.sortButton,
                          isSmallPhone && styles.sortButtonNarrow,
                          { backgroundColor: sortMode === 'title-asc' ? palette.primaryBtn : palette.inactiveBg },
                        ]}
                        onPress={() => setSortMode('title-asc')}>
                        <Ionicons name="text-outline" size={14} color="#ffffff" />
                        <Text style={styles.sortButtonText}>A-Z</Text>
                      </Pressable>
                    </>
                  ) : null}
                </>
              )}
            </View>

            {loading && sortedItems.length === 0 ? (
              <View
                style={[
                  styles.resultsWrap,
                  resultGridMode !== 'single' && styles.resultsWrapGrid,
                  resultGridMode === 'double' && styles.resultsWrapDouble,
                  resultGridMode === 'triple' && styles.resultsWrapTriple,
                ]}>
                {Array.from({ length: skeletonCount }).map((_, index) => (
                  <SearchResultSkeleton
                    key={`search-skeleton:${resultGridMode}:${index}`}
                    layoutMode={resultGridMode}
                    compact={isPhone}
                    surfaceColor={palette.inputBg}
                    borderColor={palette.border}
                  />
                ))}
              </View>
            ) : (
              <Animated.View
                style={[
                  { opacity: resultOpacity, transform: [{ translateY: resultTranslateY }] },
                  styles.resultsWrap,
                  resultGridMode !== 'single' && styles.resultsWrapGrid,
                  resultGridMode === 'double' && styles.resultsWrapDouble,
                  resultGridMode === 'triple' && styles.resultsWrapTriple,
                ]}>
                {sortedItems.map((item) => (
                  <SearchResultCard
                    key={`${item.mediaType}:${item.id}`}
                    item={item}
                    layoutMode={resultGridMode}
                    compact={isPhone}
                    isInCollection={favoriteIds.has(`${item.mediaType}:${Number(item.id)}`)}
                    isAddPending={Boolean(pendingFavoriteKeys[`${item.mediaType}:${String(item.id)}`])}
                    isAuthenticated={isAuthenticated}
                    palette={resultCardPalette}
                    onOpen={onOpenResult}
                    onAddToFavorites={onAddToFavorites}
                    onOpenCollection={openCollectionTab}
                  />
                ))}
              </Animated.View>
            )}

            {totalPages > 1 ? (
              <View style={[styles.paginationRow, isSmallPhone && styles.paginationRowStacked]}>
                <Pressable
                  style={[styles.pageButton, isSmallPhone && styles.pageButtonFull, { backgroundColor: page <= 1 ? palette.inactiveBg : palette.primaryBtn }]}
                  disabled={page <= 1}
                  onPress={() => setPage((prev) => Math.max(1, prev - 1))}>
                  <Text style={styles.pageButtonText}>Попередня</Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.pageButton,
                    isSmallPhone && styles.pageButtonFull,
                    { backgroundColor: page >= totalPages ? palette.inactiveBg : palette.primaryBtn },
                  ]}
                  disabled={page >= totalPages}
                  onPress={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                  <Text style={styles.pageButtonText}>Наступна</Text>
                </Pressable>
              </View>
            ) : null}

            {emptyStateText ? (
              <View style={[styles.emptyStateCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                <View style={styles.emptyStateHead}>
                  <Ionicons name="alert-circle-outline" size={16} color={palette.textMuted} />
                  <Text style={[styles.emptyStateText, { color: palette.textMuted }]}>{emptyStateText}</Text>
                </View>
                <View style={styles.emptyStateActions}>
                  {activeFilters.length > 0 ? (
                    <Pressable style={[styles.emptyStateButton, { backgroundColor: palette.warning }]} onPress={resetFilters}>
                      <Ionicons name="refresh-outline" size={14} color="#ffffff" />
                      <Text style={styles.emptyStateButtonText}>Скинути фільтри</Text>
                    </Pressable>
                  ) : null}
                  {queryInput.length > 0 ? (
                    <Pressable
                      style={[styles.emptyStateButton, { backgroundColor: palette.inactiveBg }]}
                      onPress={() => {
                        setQueryInput('');
                        setPage(1);
                      }}>
                      <Ionicons name="close-outline" size={14} color="#ffffff" />
                      <Text style={styles.emptyStateButtonText}>Очистити запит</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ) : null}
          </View>
        </View>
        </View>
      </ScrollView>
      {showScrollTop ? (
        <ScrollTopFab
          visible={showScrollTop}
          backgroundColor={palette.primaryBtn}
          onPress={scrollToTop}
        />
      ) : null}
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
    gap: 14,
  },
  containerPhone: {
    padding: 12,
    gap: 10,
  },
  panel: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  panelPhone: {
    borderRadius: 12,
    padding: 12,
  },
  stickyPanel: {
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  headerTitlePhone: {
    fontSize: 28,
  },
  headerText: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 14,
  },
  authRow: {
    marginTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  authRowStacked: {
    alignItems: 'stretch',
  },
  authText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  authButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  authButtonFull: {
    width: '100%',
    justifyContent: 'center',
  },
  authButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  bannerText: {
    marginTop: 10,
  },
  quickHistoryWrap: {
    marginTop: 10,
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 8,
  },
  quickHistoryTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  quickHistoryHint: {
    fontSize: 12,
  },
  quickHistoryList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickHistoryItem: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 8,
    minWidth: 165,
    flexGrow: 1,
    maxWidth: 240,
    gap: 4,
  },
  quickHistoryItemNarrow: {
    minWidth: 0,
    maxWidth: '100%',
    width: '100%',
  },
  quickHistoryBadgeRow: {
    flexDirection: 'row',
  },
  quickHistoryBadge: {
    color: '#ffffff',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 10,
    fontWeight: '800',
    overflow: 'hidden',
  },
  quickHistoryItemTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  quickHistoryItemMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 0,
    fontFamily: 'SpaceMono',
  },
  searchHeaderRow: {
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  searchHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  searchHeaderActionsStack: {
    width: '100%',
    justifyContent: 'flex-start',
  },
  searchRefreshMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchRefreshButton: {
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  searchRefreshButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  debugText: {
    marginBottom: 10,
    fontSize: 12,
  },
  adminCachePanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  adminCacheHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  adminCacheHeadTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminCacheTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  adminCacheRefreshButton: {
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminCacheRefreshText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  adminCacheStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  adminCacheCard: {
    flex: 1,
    minWidth: 220,
    borderWidth: 1,
    borderRadius: 10,
    padding: 9,
    gap: 4,
  },
  adminCacheCardPhone: {
    minWidth: 0,
    width: '100%',
    flex: 0,
  },
  adminCacheCardTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  adminCacheCardMeta: {
    fontSize: 11,
    fontWeight: '600',
  },
  adminCacheHint: {
    fontSize: 12,
  },
  adminCacheActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  adminCacheActionButton: {
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminCacheActionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  mobileFiltersToggle: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mobileFiltersToggleText: {
    fontSize: 13,
    fontWeight: '700',
  },
  compactFiltersWrap: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: 8,
  },
  compactFiltersTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  compactFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  compactFilterChip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactFilterChipText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  typeButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeButtonNarrow: {
    width: '100%',
    justifyContent: 'center',
  },
  typeButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  searchInputWrap: {
    height: 46,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 16,
  },
  clearQueryButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  quickQueryWrap: {
    marginBottom: 10,
    gap: 6,
  },
  searchShortcutHint: {
    fontSize: 11,
    marginBottom: 8,
  },
  recentQueriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  recentClearButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recentClearText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickQueryLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  quickQueryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickQueryChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickQueryChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  advancedFiltersWrap: {
    marginBottom: 10,
    gap: 8,
  },
  searchLayout: {
    width: '100%',
    gap: 12,
  },
  searchLayoutTwoPane: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  filtersPane: {
    width: '100%',
  },
  filtersPaneWide: {
    width: 320,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  resultsPane: {
    width: '100%',
  },
  resultsPaneWide: {
    flex: 1,
    minWidth: 0,
  },
  filtersTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  filtersRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    minWidth: 120,
    flexGrow: 1,
  },
  filterToggle: {
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterToggleText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  activeFiltersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  showMoreGenresButton: {
    marginTop: 2,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  showMoreGenresText: {
    fontSize: 12,
    fontWeight: '700',
  },
  activeFilterChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeFilterChipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeFilterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  resultMeta: {
    marginBottom: 10,
    fontSize: 13,
  },
  errorText: {
    marginBottom: 10,
    fontWeight: '700',
  },
  sortRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  sortButton: {
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortButtonNarrow: {
    width: '100%',
    justifyContent: 'center',
  },
  sortButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  resultsWrap: {
    width: '100%',
    gap: 0,
  },
  resultsWrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  resultsWrapDouble: {
    rowGap: 0,
  },
  resultsWrapTriple: {
    rowGap: 0,
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  paginationRowStacked: {
    flexDirection: 'column',
    gap: 8,
  },
  pageButton: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pageButtonFull: {
    width: '100%',
    alignItems: 'center',
  },
  pageButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  emptyStateCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  emptyStateHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyStateText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  emptyStateActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyStateButton: {
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
