import { Movie } from '@/types/movie';

import { applyMovieFilters, parseRating } from './utils';

const BASE_MOVIES: Movie[] = [
  { id: 'a', title: 'Alpha', rating: 7.5, image: 'https://example.com/a.jpg', watched: false },
  { id: 'b', title: 'Beta', rating: 9.2, image: 'https://example.com/b.jpg', watched: true },
  { id: 'c', title: 'Gamma', rating: 8.1, image: 'https://example.com/c.jpg', watched: true },
];

describe('parseRating', () => {
  it('parses values with comma and clamps to 10', () => {
    expect(parseRating('9,5')).toBe(9.5);
    expect(parseRating('12')).toBe(10);
  });

  it('returns null for invalid input', () => {
    expect(parseRating('abc')).toBeNull();
  });
});

describe('applyMovieFilters', () => {
  it('filters by query and only watched', () => {
    const result = applyMovieFilters(BASE_MOVIES, {
      query: 'ga',
      onlyWatched: true,
      sort: 'rating-desc',
    });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Gamma');
  });

  it('sorts by title descending', () => {
    const result = applyMovieFilters(BASE_MOVIES, {
      query: '',
      onlyWatched: false,
      sort: 'title-desc',
    });

    expect(result.map((movie) => movie.title)).toEqual(['Gamma', 'Beta', 'Alpha']);
  });
});
