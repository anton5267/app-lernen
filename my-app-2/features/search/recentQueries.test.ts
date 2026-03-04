import { SearchContentType } from '@/types/api';

import {
  EMPTY_RECENT_QUERIES,
  normalizeRecentQuery,
  parseRecentQueriesPayload,
  resetRecentQueriesForType,
  sanitizeRecentQueriesPayload,
  upsertRecentQuery,
} from './recentQueries';

describe('recentQueries utils', () => {
  it('normalizes query and ignores very short values', () => {
    expect(normalizeRecentQuery('  Interstellar  trailer  ')).toBe('Interstellar trailer');
    expect(normalizeRecentQuery(' a ')).toBeNull();
  });

  it('sanitizes payload by known keys and limit', () => {
    const payload = {
      movie: ['Dune', '', ' Interstellar '],
      tv: ['Dark'],
      youtube: ['yt1', 123, 'yt2'],
      unknown: ['x'],
    };

    const result = sanitizeRecentQueriesPayload(payload, 2);
    expect(result.movie).toEqual(['Dune', 'Interstellar']);
    expect(result.tv).toEqual(['Dark']);
    expect(result.youtube).toEqual(['yt1', 'yt2']);
    expect(result.twitch).toEqual([]);
  });

  it('parses json payload and falls back to empty on invalid json', () => {
    const parsed = parseRecentQueriesPayload('{"movie":["Batman"]}');
    expect(parsed.movie).toEqual(['Batman']);
    expect(parseRecentQueriesPayload('{bad-json')).toEqual(EMPTY_RECENT_QUERIES);
  });

  it('upserts query by type with case-insensitive dedupe', () => {
    const initial = {
      ...EMPTY_RECENT_QUERIES,
      movie: ['Dune', 'Interstellar'],
    };
    const updated = upsertRecentQuery(initial, 'movie', 'dune');

    expect(updated.movie).toEqual(['dune', 'Interstellar']);
    expect(updated.tv).toEqual([]);
  });

  it('returns same reference if upsert query is invalid', () => {
    const initial = { ...EMPTY_RECENT_QUERIES };
    const updated = upsertRecentQuery(initial, 'movie', ' ');
    expect(updated).toBe(initial);
  });

  it('resets only selected type queries', () => {
    const initial = {
      ...EMPTY_RECENT_QUERIES,
      movie: ['Dune'],
      tv: ['Dark'],
    };
    const updated = resetRecentQueriesForType(initial, 'movie');
    expect(updated.movie).toEqual([]);
    expect(updated.tv).toEqual(['Dark']);
  });

  it('returns same reference if selected type is already empty', () => {
    const initial = { ...EMPTY_RECENT_QUERIES };
    const type: SearchContentType = 'twitch';
    const updated = resetRecentQueriesForType(initial, type);
    expect(updated).toBe(initial);
  });
});
