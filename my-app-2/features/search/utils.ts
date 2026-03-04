import { BackendConfigStatus, SearchContentType, SearchMovie, SearchResponse } from '@/types/api';

export type SearchSortMode = 'relevance' | 'rating-desc' | 'title-asc';

type SearchFilterParams = {
  items: SearchMovie[];
  isCatalogType: boolean;
  minRatingInput: string;
  yearInput: string;
  onlyWithPoster: boolean;
  sortMode: SearchSortMode;
};

function parseMinRating(value: string) {
  const raw = Number(value.replace(',', '.'));
  if (!Number.isFinite(raw)) {
    return null;
  }
  return Math.max(0, Math.min(10, raw));
}

export function applySearchFilters(params: SearchFilterParams) {
  const { items, isCatalogType, minRatingInput, yearInput, onlyWithPoster, sortMode } = params;
  const minRating = parseMinRating(minRatingInput);
  const year = yearInput.trim();

  const filtered = items.filter((item) => {
    if (onlyWithPoster && !item.poster) {
      return false;
    }
    if (isCatalogType && minRating !== null && (item.rating ?? -1) < minRating) {
      return false;
    }
    if (isCatalogType && year && item.year !== year) {
      return false;
    }
    return true;
  });

  if (sortMode === 'relevance') {
    return filtered;
  }

  const sorted = [...filtered];
  if (sortMode === 'rating-desc') {
    sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
  } else {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'uk'));
  }
  return sorted;
}

export function buildActiveFilterChips(params: {
  isCatalogType: boolean;
  minRatingInput: string;
  yearInput: string;
  onlyWithPoster: boolean;
  sortMode: SearchSortMode;
}) {
  const { isCatalogType, minRatingInput, yearInput, onlyWithPoster, sortMode } = params;
  const chips: string[] = [];
  if (onlyWithPoster) {
    chips.push('Лише з постером');
  }
  if (isCatalogType && minRatingInput.trim()) {
    chips.push(`Рейтинг >= ${minRatingInput.trim()}`);
  }
  if (isCatalogType && yearInput.trim()) {
    chips.push(`Рік: ${yearInput.trim()}`);
  }
  if (isCatalogType && sortMode !== 'relevance') {
    chips.push(sortMode === 'rating-desc' ? 'Сорт: рейтинг' : 'Сорт: A-Z');
  }
  return chips;
}

export function sortModeLabel(mode: SearchSortMode) {
  if (mode === 'rating-desc') {
    return 'рейтинг';
  }
  if (mode === 'title-asc') {
    return 'A-Z';
  }
  return 'релевантність';
}

type ResolveSourceModeParams = {
  searchType: SearchContentType;
  searchMeta: SearchResponse['meta'] | null;
  configStatus: BackendConfigStatus | null;
  demoMode: boolean;
};

export function resolveSourceMode(params: ResolveSourceModeParams): 'real' | 'demo' {
  const { searchType, searchMeta, configStatus, demoMode } = params;
  if (searchMeta?.sourceMode === 'real' || searchMeta?.sourceMode === 'demo') {
    return searchMeta.sourceMode;
  }

  const configMode =
    searchType === 'youtube'
      ? configStatus?.sources.youtube.mode
      : searchType === 'twitch'
        ? configStatus?.sources.twitch.mode
        : configStatus?.sources.tmdb.mode;

  return configMode ?? (demoMode ? 'demo' : 'real');
}

type EmptyStateTextParams = {
  loading: boolean;
  hasResults: boolean;
  error: string | null;
  reason: string | null | undefined;
  hint: string | null | undefined;
  hasActiveFilters: boolean;
};

export function buildEmptyStateText(params: EmptyStateTextParams) {
  const { loading, hasResults, error, reason, hint, hasActiveFilters } = params;
  if (loading || hasResults) {
    return null;
  }
  if (error) {
    return 'Не вдалося виконати пошук. Перевірте backend і спробуйте ще раз.';
  }

  if (reason === 'query_required') {
    return 'Введіть запит, щоб почати пошук по цьому джерелу.';
  }
  if (reason === 'missing_tmdb_key' || reason === 'missing_youtube_key' || reason === 'missing_twitch_key') {
    return hint ?? 'Додайте ключі у backend/.env і перезапустіть backend.';
  }
  if (reason === 'demo_recommendations') {
    return 'Демо-режим: показано обмежений набір рекомендацій.';
  }
  if (reason === 'no_results') {
    return hint ?? 'Нічого не знайдено. Спробуйте інший запит або фільтри.';
  }
  if (hasActiveFilters) {
    return 'Після фільтрів нічого не залишилось. Спробуйте скинути частину фільтрів.';
  }
  return 'Нічого не знайдено за цим запитом.';
}

type ShouldFetchExternalEmptyQueryParams = {
  searchType: SearchContentType;
  configStatus: BackendConfigStatus | null;
};

/**
 * For YouTube/Twitch in real mode, backend requires a non-empty query.
 * In this case we can skip the request and render a local `query_required` state.
 * For demo mode we still fetch to receive curated recommendations.
 */
export function shouldFetchExternalEmptyQuery(params: ShouldFetchExternalEmptyQueryParams) {
  const { searchType, configStatus } = params;
  if (searchType !== 'youtube' && searchType !== 'twitch') {
    return true;
  }

  const sourceMode =
    searchType === 'youtube'
      ? configStatus?.sources.youtube.mode
      : configStatus?.sources.twitch.mode;

  return sourceMode !== 'real';
}
