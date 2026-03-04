export type SearchContentType = 'movie' | 'tv' | 'multi' | 'youtube' | 'twitch';

export type UserSettings = {
  language: 'uk' | 'en';
  theme: 'system' | 'light' | 'dark' | 'warm';
  emailNotifications: boolean;
};

export type ApiUser = {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  provider: 'local' | 'google' | 'demo';
  isAdmin: boolean;
  settings: UserSettings;
};

export type SearchMovie = {
  id: number | string;
  title: string;
  poster: string | null;
  rating: number | null;
  year: string | null;
  mediaType: 'movie' | 'tv' | 'youtube' | 'twitch';
  externalUrl: string | null;
  channelTitle: string | null;
  isLive: boolean;
};

export type SearchResponse = {
  page: number;
  totalPages: number;
  totalResults: number;
  results: SearchMovie[];
  demoMode?: boolean;
  source?: 'search' | 'trending' | 'youtube' | 'twitch';
  searchType?: SearchContentType;
  meta?: {
    sourceMode?: 'real' | 'demo' | null;
    reason?: string | null;
    hint?: string | null;
    category?: string | null;
  };
};

export type GenreOption = {
  id: number;
  name: string;
};

export type WatchProviderType = 'subscription' | 'rent' | 'buy';

export type WatchProvider = {
  providerId: number;
  providerName: string;
  logo: string | null;
  type: WatchProviderType;
};

export type CastMember = {
  id: number;
  name: string;
  character: string | null;
  profile: string | null;
};

export type WatchProvidersInfo = {
  region: string | null;
  link: string | null;
  items: WatchProvider[];
};

export type MovieDetails = {
  id: number;
  mediaType: 'movie' | 'tv';
  title: string;
  poster: string | null;
  backdrop: string | null;
  rating: number | null;
  year: string | null;
  overview: string;
  genres: string[];
  runtime: number | null;
  trailerUrl: string | null;
  trailerEmbedUrl: string | null;
  watchProviders: WatchProvidersInfo;
  cast: CastMember[];
  similar: SearchMovie[];
  demoMode?: boolean;
  sourceMode?: 'real' | 'demo';
};

export type TvDetails = MovieDetails;

export type FavoriteMovie = {
  id: string;
  userId: string;
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  poster: string | null;
  rating: number | null;
  year: string | null;
  watched: boolean;
  personalRating: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type ViewingHistoryItem = {
  id: string;
  userId: string;
  mediaType: 'movie' | 'tv' | 'youtube' | 'twitch';
  contentId: string;
  title: string;
  poster: string | null;
  rating: number | null;
  year: string | null;
  externalUrl: string | null;
  channelTitle: string | null;
  viewedAt: string;
};

export type FavoritesExportPayload = {
  version: number;
  exportedAt: string;
  items: FavoriteMovie[];
};

export type FavoritesImportResponse = {
  mode: 'merge' | 'replace';
  total: number;
  imported: number;
  skipped: number;
};

export type CollectionShareLink = {
  id: string;
  token: string;
  title: string;
  createdAt: string;
  expiresAt: string | null;
  expired: boolean;
  url: string;
};

export type PublicSharedFavorite = {
  mediaType: 'movie' | 'tv';
  tmdbId: number;
  title: string;
  poster: string | null;
  rating: number | null;
  year: string | null;
  watched: boolean;
  personalRating: number | null;
};

export type PublicSharedCollectionPayload = {
  share: {
    id: string;
    title: string;
    createdAt: string;
    expiresAt: string | null;
    expired: boolean;
    ownerName: string;
  };
  items: PublicSharedFavorite[];
};

export type BackendConfigStatus = {
  sources: {
    tmdb: { configured: boolean; mode: 'real' | 'demo' };
    youtube: { configured: boolean; mode: 'real' | 'demo' };
    twitch: { configured: boolean; mode: 'real' | 'demo' };
  };
  google: {
    configured: boolean;
  };
};

export type CacheStats = {
  hits: number;
  misses: number;
  keys: number;
  ksize: number;
  vsize: number;
};

export type AdminCacheClearSource = 'all' | 'tmdb' | 'external';

export type AdminCacheStatsResponse = {
  admin: {
    id: string;
    email: string;
  };
  caches: {
    tmdb: CacheStats;
    external: CacheStats;
  };
};
