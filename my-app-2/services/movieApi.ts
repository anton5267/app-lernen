import {
  CollectionShareLink,
  AdminCacheClearSource,
  AdminCacheStatsResponse,
  BackendConfigStatus,
  FavoriteMovie,
  FavoritesExportPayload,
  FavoritesImportResponse,
  GenreOption,
  MovieDetails,
  PublicSharedCollectionPayload,
  SearchContentType,
  SearchMovie,
  SearchResponse,
  TvDetails,
  ViewingHistoryItem,
} from '@/types/api';

import { API_BASE_URL, apiFetch } from './apiClient';

type ReadCacheEntry = {
  expiresAt: number;
  value: unknown;
};

const READ_CACHE_DEFAULT_TTL_MS = 45_000;
const READ_CACHE_MAX_ENTRIES = 250;
const READ_CACHE = new Map<string, ReadCacheEntry>();
const IN_FLIGHT_READS = new Map<string, Promise<unknown>>();
let READ_CACHE_GENERATION = 0;

function getCachedReadValue<T>(key: string): T | null {
  const entry = READ_CACHE.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt <= Date.now()) {
    READ_CACHE.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCachedReadValue<T>(key: string, value: T, ttlMs = READ_CACHE_DEFAULT_TTL_MS) {
  pruneReadCache();
  READ_CACHE.set(key, {
    value,
    expiresAt: Date.now() + Math.max(0, ttlMs),
  });
  pruneReadCache();
}

function pruneReadCache() {
  if (READ_CACHE.size === 0) {
    return;
  }

  const now = Date.now();
  for (const [key, entry] of READ_CACHE.entries()) {
    if (entry.expiresAt <= now) {
      READ_CACHE.delete(key);
    }
  }

  while (READ_CACHE.size > READ_CACHE_MAX_ENTRIES) {
    const oldestKey = READ_CACHE.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    READ_CACHE.delete(oldestKey);
  }
}

type ReadCacheFetchOptions = {
  ttlMs?: number;
  bypassInFlight?: boolean;
};

function withSignalAwareCacheOptions(signal?: AbortSignal, ttlMs?: number): ReadCacheFetchOptions {
  return {
    ttlMs,
    // If a caller passes AbortSignal, keep request lifecycle isolated from other callers.
    // This avoids cross-cancel issues when one screen aborts and another still needs the same key.
    bypassInFlight: Boolean(signal),
  };
}

async function fetchReadCachedWithOptions<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: ReadCacheFetchOptions = {}
) {
  const ttlMs = options.ttlMs ?? READ_CACHE_DEFAULT_TTL_MS;
  const bypassInFlight = options.bypassInFlight ?? false;
  const cached = getCachedReadValue<T>(key);
  if (cached !== null) {
    return cached;
  }

  if (!bypassInFlight) {
    const inFlight = IN_FLIGHT_READS.get(key);
    if (inFlight) {
      return inFlight as Promise<T>;
    }
  }

  const requestGeneration = READ_CACHE_GENERATION;

  if (bypassInFlight) {
    const response = await fetcher();
    if (requestGeneration === READ_CACHE_GENERATION) {
      setCachedReadValue(key, response, ttlMs);
    }
    return response;
  }

  const requestPromise = fetcher()
    .then((response) => {
      if (requestGeneration === READ_CACHE_GENERATION) {
        setCachedReadValue(key, response, ttlMs);
      }
      return response;
    })
    .finally(() => {
      if (IN_FLIGHT_READS.get(key) === requestPromise) {
        IN_FLIGHT_READS.delete(key);
      }
    });

  IN_FLIGHT_READS.set(key, requestPromise);
  return requestPromise;
}

export function clearClientReadCache(keyPrefix?: string) {
  if (!keyPrefix) {
    READ_CACHE_GENERATION += 1;
    READ_CACHE.clear();
    IN_FLIGHT_READS.clear();
    return;
  }

  for (const key of READ_CACHE.keys()) {
    if (key.startsWith(keyPrefix)) {
      READ_CACHE.delete(key);
    }
  }

  for (const key of IN_FLIGHT_READS.keys()) {
    if (key.startsWith(keyPrefix)) {
      IN_FLIGHT_READS.delete(key);
    }
  }
}

export async function searchMovies(
  query: string,
  page: number,
  type: SearchContentType = 'movie',
  signal?: AbortSignal
) {
  const params = new URLSearchParams({
    query,
    page: String(page),
    type,
  });
  const endpoint = `/api/search?${params.toString()}`;
  const cacheKey = `search:${endpoint}`;

  return fetchReadCachedWithOptions(cacheKey, () => apiFetch<SearchResponse>(endpoint, { signal }), withSignalAwareCacheOptions(signal));
}

export async function getBackendConfigStatus(signal?: AbortSignal) {
  const endpoint = '/api/config/status';
  return fetchReadCachedWithOptions(
    `config:${endpoint}`,
    () => apiFetch<BackendConfigStatus>(endpoint, { signal }),
    withSignalAwareCacheOptions(signal, 15_000)
  );
}

export async function getAdminCacheStats(signal?: AbortSignal) {
  const endpoint = '/api/admin/cache/stats';
  return fetchReadCachedWithOptions(
    `admin:${endpoint}`,
    () => apiFetch<AdminCacheStatsResponse>(endpoint, { signal }),
    withSignalAwareCacheOptions(signal, 10_000)
  );
}

export async function clearAdminCache(source: AdminCacheClearSource = 'all') {
  return apiFetch<{
    source: AdminCacheClearSource;
    caches: AdminCacheStatsResponse['caches'];
  }>('/api/admin/cache/clear', {
    method: 'POST',
    body: { source },
  });
}

export async function getTrendingMovies(page: number, type: 'movie' | 'tv' = 'movie', signal?: AbortSignal) {
  const params = new URLSearchParams({
    page: String(page),
    type,
  });
  const endpoint = `/api/trending?${params.toString()}`;
  return fetchReadCachedWithOptions(
    `trending:${endpoint}`,
    () => apiFetch<SearchResponse>(endpoint, { signal }),
    withSignalAwareCacheOptions(signal)
  );
}

export type CatalogType = 'movie' | 'tv';
export type CatalogCategory = 'popular' | 'now_playing' | 'upcoming' | 'top_rated' | 'airing_today' | 'on_the_air';
export type CatalogSort = 'popularity.desc' | 'primary_release_date.desc' | 'first_air_date.desc' | 'vote_average.desc' | 'title.asc' | 'name.asc';
export type WatchTypeFilter = 'flatrate' | 'free' | 'ads' | 'rent' | 'buy';

export async function getCatalogBrowse(
  params: {
    page: number;
    type: CatalogType;
    category: CatalogCategory;
    sort: CatalogSort;
    minRating?: string;
    yearFrom?: string;
    yearTo?: string;
    genres?: number[];
    watchTypes?: WatchTypeFilter[];
    onlyWithPoster?: boolean;
  },
  signal?: AbortSignal
) {
  const query = new URLSearchParams({
    page: String(params.page),
    type: params.type,
    category: params.category,
    sort: params.sort,
  });

  if (params.minRating?.trim()) {
    query.set('minRating', params.minRating.trim());
  }
  if (params.yearFrom?.trim()) {
    query.set('yearFrom', params.yearFrom.trim());
  }
  if (params.yearTo?.trim()) {
    query.set('yearTo', params.yearTo.trim());
  }
  if (params.genres && params.genres.length > 0) {
    query.set('genres', params.genres.join(','));
  }
  if (params.watchTypes && params.watchTypes.length > 0) {
    query.set('watchTypes', params.watchTypes.join(','));
  }
  if (params.onlyWithPoster) {
    query.set('onlyWithPoster', 'true');
  }

  const endpoint = `/api/catalog?${query.toString()}`;
  return fetchReadCachedWithOptions(
    `catalog:${endpoint}`,
    () => apiFetch<SearchResponse>(endpoint, { signal }),
    withSignalAwareCacheOptions(signal)
  );
}

export async function getCatalogGenres(type: CatalogType, signal?: AbortSignal) {
  const endpoint = `/api/genres?type=${type}`;
  return fetchReadCachedWithOptions<{ type: CatalogType; items: GenreOption[]; sourceMode: 'real' | 'demo'; demoMode?: boolean }>(
    `genres:${endpoint}`,
    () => apiFetch(endpoint, { signal }),
    withSignalAwareCacheOptions(signal, 60_000)
  );
}

export async function getMovieDetails(movieId: number, signal?: AbortSignal) {
  const endpoint = `/api/movie/${movieId}`;
  return fetchReadCachedWithOptions(
    `details:${endpoint}`,
    () => apiFetch<MovieDetails>(endpoint, { signal }),
    withSignalAwareCacheOptions(signal)
  );
}

export async function getTvDetails(tvId: number, signal?: AbortSignal) {
  const endpoint = `/api/tv/${tvId}`;
  return fetchReadCachedWithOptions(
    `details:${endpoint}`,
    () => apiFetch<TvDetails>(endpoint, { signal }),
    withSignalAwareCacheOptions(signal)
  );
}

export async function getFavorites() {
  const response = await apiFetch<{ items: FavoriteMovie[] }>('/api/favorites');
  return response.items;
}

export async function getViewingHistory(limit = 50) {
  const params = new URLSearchParams({
    limit: String(limit),
  });
  const response = await apiFetch<{ items: ViewingHistoryItem[] }>(`/api/history?${params.toString()}`);
  return response.items;
}

export async function trackViewingHistory(payload: {
  mediaType: ViewingHistoryItem['mediaType'];
  contentId: string;
  title: string;
  poster?: string | null;
  rating?: number | null;
  year?: string | null;
  externalUrl?: string | null;
  channelTitle?: string | null;
}) {
  const response = await apiFetch<{ item: ViewingHistoryItem; updated: boolean }>('/api/history', {
    method: 'POST',
    body: payload,
  });
  return response.item;
}

export async function clearViewingHistory() {
  return apiFetch<{ cleared: number }>('/api/history', {
    method: 'DELETE',
  });
}

export async function exportFavoritesCollection() {
  return apiFetch<FavoritesExportPayload>('/api/favorites/export');
}

export async function importFavoritesCollection(items: unknown[], mode: 'merge' | 'replace' = 'merge') {
  return apiFetch<FavoritesImportResponse>('/api/favorites/import', {
    method: 'POST',
    body: { items, mode },
  });
}

export async function listCollectionShareLinks() {
  const response = await apiFetch<{ items: CollectionShareLink[] }>('/api/favorites/share');
  return response.items;
}

export async function createCollectionShareLink(title?: string, expiresInDays?: number | null) {
  const response = await apiFetch<{ item: CollectionShareLink }>('/api/favorites/share', {
    method: 'POST',
    body: { title: title ?? '', expiresInDays: expiresInDays ?? null },
  });
  return response.item;
}

export async function deleteCollectionShareLink(shareId: string) {
  await apiFetch<void>(`/api/favorites/share/${shareId}`, {
    method: 'DELETE',
  });
}

export async function getPublicSharedCollection(token: string, signal?: AbortSignal) {
  const endpoint = `/api/share/${token}`;
  return fetchReadCachedWithOptions(
    `share:${endpoint}`,
    () => apiFetch<PublicSharedCollectionPayload>(endpoint, { signal }),
    withSignalAwareCacheOptions(signal, 20_000)
  );
}

export async function addFavorite(movie: SearchMovie) {
  const tmdbId = Number(movie.id);
  if (!Number.isFinite(tmdbId)) {
    throw new Error('До колекції можна додати лише TMDB контент.');
  }
  if (movie.mediaType !== 'movie' && movie.mediaType !== 'tv') {
    throw new Error('До колекції можна додати лише фільми або серіали з TMDB.');
  }

  const response = await apiFetch<{ item: FavoriteMovie }>('/api/favorites', {
    method: 'POST',
    body: {
      mediaType: movie.mediaType,
      tmdbId,
      title: movie.title,
      poster: movie.poster,
      rating: movie.rating,
      year: movie.year,
    },
  });
  return response.item;
}

export async function updateFavorite(
  favoriteId: string,
  payload: {
    watched?: boolean;
    personalRating?: number | null;
    notes?: string;
  }
) {
  const response = await apiFetch<{ item: FavoriteMovie }>(`/api/favorites/${favoriteId}`, {
    method: 'PATCH',
    body: payload,
  });
  return response.item;
}

export async function removeFavorite(favoriteId: string) {
  await apiFetch<void>(`/api/favorites/${favoriteId}`, {
    method: 'DELETE',
  });
}

export async function uploadVideoFile(file: {
  uri: string;
  name: string;
  mimeType: string;
}) {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType,
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'ngrok-skip-browser-warning': 'true',
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      message = payload.error || message;
    } catch {
      // keep fallback
    }
    throw new Error(message);
  }

  return response.json() as Promise<{
    item: {
      id: string;
      originalName: string;
      url: string;
      size: number;
      mimetype: string;
    };
  }>;
}
