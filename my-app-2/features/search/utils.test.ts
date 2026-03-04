import { SearchMovie } from '@/types/api';

import {
  applySearchFilters,
  buildActiveFilterChips,
  buildEmptyStateText,
  resolveSourceMode,
  shouldFetchExternalEmptyQuery,
  sortModeLabel,
} from './utils';

const BASE_RESULTS: SearchMovie[] = [
  {
    id: 1,
    title: 'Batman',
    poster: 'https://img.com/batman.jpg',
    rating: 8.3,
    year: '2022',
    mediaType: 'movie',
    externalUrl: null,
    channelTitle: null,
    isLive: false,
  },
  {
    id: 2,
    title: 'Andor',
    poster: null,
    rating: 8.6,
    year: '2022',
    mediaType: 'tv',
    externalUrl: null,
    channelTitle: null,
    isLive: false,
  },
  {
    id: 3,
    title: 'Avatar',
    poster: 'https://img.com/avatar.jpg',
    rating: 7.7,
    year: '2009',
    mediaType: 'movie',
    externalUrl: null,
    channelTitle: null,
    isLive: false,
  },
];

const CONFIG_STATUS = {
  sources: {
    tmdb: { configured: true, mode: 'real' as const },
    youtube: { configured: false, mode: 'demo' as const },
    twitch: { configured: true, mode: 'real' as const },
  },
  google: { configured: true },
};

describe('search utils', () => {
  it('applies catalog filters by rating/year/poster', () => {
    const filtered = applySearchFilters({
      items: BASE_RESULTS,
      isCatalogType: true,
      minRatingInput: '8',
      yearInput: '2022',
      onlyWithPoster: true,
      sortMode: 'relevance',
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Batman');
  });

  it('sorts by title in ukrainian locale style', () => {
    const sorted = applySearchFilters({
      items: BASE_RESULTS,
      isCatalogType: true,
      minRatingInput: '',
      yearInput: '',
      onlyWithPoster: false,
      sortMode: 'title-asc',
    });

    expect(sorted.map((item) => item.title)).toEqual(['Andor', 'Avatar', 'Batman']);
  });

  it('builds active chips only for active params', () => {
    const chips = buildActiveFilterChips({
      isCatalogType: true,
      minRatingInput: '7.5',
      yearInput: '',
      onlyWithPoster: true,
      sortMode: 'rating-desc',
    });

    expect(chips).toEqual(['Лише з постером', 'Рейтинг >= 7.5', 'Сорт: рейтинг']);
  });

  it('returns readable sort labels', () => {
    expect(sortModeLabel('relevance')).toBe('релевантність');
    expect(sortModeLabel('rating-desc')).toBe('рейтинг');
  });

  it('resolves source mode from meta, config, and demo fallback', () => {
    expect(
      resolveSourceMode({
        searchType: 'youtube',
        searchMeta: { sourceMode: 'real' },
        configStatus: CONFIG_STATUS,
        demoMode: true,
      })
    ).toBe('real');

    expect(
      resolveSourceMode({
        searchType: 'youtube',
        searchMeta: null,
        configStatus: CONFIG_STATUS,
        demoMode: false,
      })
    ).toBe('demo');

    expect(
      resolveSourceMode({
        searchType: 'movie',
        searchMeta: null,
        configStatus: null,
        demoMode: true,
      })
    ).toBe('demo');
  });

  it('builds empty-state text from backend reason/hint and filter state', () => {
    expect(
      buildEmptyStateText({
        loading: false,
        hasResults: false,
        error: null,
        reason: 'query_required',
        hint: null,
        hasActiveFilters: false,
      })
    ).toContain('Введіть запит');

    expect(
      buildEmptyStateText({
        loading: false,
        hasResults: false,
        error: null,
        reason: 'missing_tmdb_key',
        hint: null,
        hasActiveFilters: false,
      })
    ).toContain('backend/.env');

    expect(
      buildEmptyStateText({
        loading: false,
        hasResults: false,
        error: null,
        reason: null,
        hint: null,
        hasActiveFilters: true,
      })
    ).toContain('Після фільтрів');
  });

  it('skips empty query fetch for external sources in real mode', () => {
    const REAL_EXTERNAL_CONFIG = {
      ...CONFIG_STATUS,
      sources: {
        ...CONFIG_STATUS.sources,
        youtube: { configured: true, mode: 'real' as const },
      },
    };

    expect(
      shouldFetchExternalEmptyQuery({
        searchType: 'youtube',
        configStatus: REAL_EXTERNAL_CONFIG,
      })
    ).toBe(false);

    expect(
      shouldFetchExternalEmptyQuery({
        searchType: 'youtube',
        configStatus: CONFIG_STATUS,
      })
    ).toBe(true);

    expect(
      shouldFetchExternalEmptyQuery({
        searchType: 'movie',
        configStatus: CONFIG_STATUS,
      })
    ).toBe(true);
  });
});
