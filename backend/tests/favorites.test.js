const {
  normalizeImportedFavorite,
  parseFavoriteMediaType,
  parsePersonalRating,
  toFavoriteKey,
} = require('../src/favorites');

describe('favorites helpers', () => {
  it('parses favorite media type with movie fallback', () => {
    expect(parseFavoriteMediaType('movie')).toBe('movie');
    expect(parseFavoriteMediaType('tv')).toBe('tv');
    expect(parseFavoriteMediaType('youtube')).toBe('movie');
    expect(parseFavoriteMediaType(undefined)).toBe('movie');
  });

  it('parses personal rating in 0..10 range', () => {
    expect(parsePersonalRating(null)).toBeNull();
    expect(parsePersonalRating('')).toBeNull();
    expect(parsePersonalRating('oops')).toBeNull();
    expect(parsePersonalRating(-5)).toBe(0);
    expect(parsePersonalRating(12)).toBe(10);
    expect(parsePersonalRating(8.5)).toBe(8.5);
  });

  it('normalizes valid imported favorite and filters invalid payloads', () => {
    expect(normalizeImportedFavorite({ tmdbId: 'nope', title: 'X' })).toBeNull();
    expect(normalizeImportedFavorite({ tmdbId: 10, title: '' })).toBeNull();

    expect(
      normalizeImportedFavorite({
        tmdbId: 42.8,
        mediaType: 'tv',
        title: '  Interstellar  ',
        poster: 'https://example.com/poster.jpg',
        rating: 12,
        year: 'Year: 2024!',
        watched: 1,
        personalRating: -2,
        notes: 'A'.repeat(2000),
      })
    ).toEqual({
      mediaType: 'tv',
      tmdbId: 42,
      title: 'Interstellar',
      poster: 'https://example.com/poster.jpg',
      rating: 10,
      year: '2024',
      watched: true,
      personalRating: 0,
      notes: 'A'.repeat(1500),
    });
  });

  it('builds stable dedupe key', () => {
    expect(toFavoriteKey('movie', 101)).toBe('movie:101');
    expect(toFavoriteKey('tv', '77')).toBe('tv:77');
    expect(toFavoriteKey('invalid', 88)).toBe('movie:88');
  });
});
