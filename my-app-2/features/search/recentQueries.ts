import { SearchContentType } from '@/types/api';

export const SEARCH_RECENT_QUERIES_KEY = 'moviefinder.search.recentQueries.v1';
export const RECENT_QUERY_LIMIT = 8;

export type RecentQueriesByType = Record<SearchContentType, string[]>;

export const EMPTY_RECENT_QUERIES: RecentQueriesByType = {
  movie: [],
  tv: [],
  multi: [],
  youtube: [],
  twitch: [],
};

export function normalizeRecentQuery(raw: string) {
  const normalized = raw.trim().replace(/\s+/g, ' ');
  return normalized.length >= 2 ? normalized : null;
}

export function sanitizeRecentQueriesPayload(payload: unknown, limit = RECENT_QUERY_LIMIT): RecentQueriesByType {
  const next: RecentQueriesByType = { ...EMPTY_RECENT_QUERIES };
  const source = payload && typeof payload === 'object' ? (payload as Partial<Record<SearchContentType, unknown>>) : null;

  (Object.keys(EMPTY_RECENT_QUERIES) as SearchContentType[]).forEach((key) => {
    const value = source?.[key];
    if (!Array.isArray(value)) {
      return;
    }

    next[key] = value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, limit);
  });

  return next;
}

export function parseRecentQueriesPayload(raw: string | null, limit = RECENT_QUERY_LIMIT): RecentQueriesByType {
  if (!raw) {
    return { ...EMPTY_RECENT_QUERIES };
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeRecentQueriesPayload(parsed, limit);
  } catch {
    return { ...EMPTY_RECENT_QUERIES };
  }
}

export function upsertRecentQuery(
  state: RecentQueriesByType,
  type: SearchContentType,
  rawValue: string,
  limit = RECENT_QUERY_LIMIT
) {
  const normalized = normalizeRecentQuery(rawValue);
  if (!normalized) {
    return state;
  }

  const current = state[type] ?? [];
  const deduped = [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, limit);

  if (
    deduped.length === current.length &&
    deduped.every((item, index) => item === current[index])
  ) {
    return state;
  }

  return {
    ...state,
    [type]: deduped,
  };
}

export function resetRecentQueriesForType(state: RecentQueriesByType, type: SearchContentType) {
  const current = state[type] ?? [];
  if (current.length === 0) {
    return state;
  }

  return {
    ...state,
    [type]: [],
  };
}
