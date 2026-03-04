import { Movie, MovieSort } from '@/types/movie';

type FilterOptions = {
  query: string;
  onlyWatched: boolean;
  sort: MovieSort;
};

export function clampRating(value: number) {
  return Math.min(10, Math.max(0, value));
}

export function parseRating(value: string) {
  const numeric = Number(value.replace(',', '.'));
  if (Number.isNaN(numeric)) {
    return null;
  }
  return clampRating(numeric);
}

export function applyMovieFilters(movies: Movie[], options: FilterOptions) {
  const q = options.query.trim().toLowerCase();

  const filtered = movies.filter((movie) => {
    if (options.onlyWatched && !movie.watched) {
      return false;
    }
    if (!q) {
      return true;
    }
    return movie.title.toLowerCase().includes(q);
  });

  const sorters: Record<MovieSort, (a: Movie, b: Movie) => number> = {
    'rating-desc': (a, b) => b.rating - a.rating,
    'rating-asc': (a, b) => a.rating - b.rating,
    'title-asc': (a, b) => a.title.localeCompare(b.title, 'uk'),
    'title-desc': (a, b) => b.title.localeCompare(a.title, 'uk'),
  };

  return [...filtered].sort(sorters[options.sort]);
}
