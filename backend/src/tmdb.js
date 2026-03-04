const NodeCache = require('node-cache');
const { tmdbApiKey, tmdbBaseUrl, watchRegion } = require('./config');

const cache = new NodeCache({ stdTTL: 60 * 60, checkperiod: 120 });
const DEMO_PAGE_SIZE = 10;

const DEMO_MOVIES = [
  {
    id: 10001,
    title: 'Початок',
    rating: 9.0,
    year: '2010',
    poster: 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
    overview: 'Демо-фільм. Сон всередині сну і складна операція пограбування ідей.',
    genres: ['Sci-Fi', 'Action'],
    runtime: 148,
  },
  {
    id: 10002,
    title: 'Темний лицар',
    rating: 9.5,
    year: '2008',
    poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/hqkIcbrOHL86UncnHIsHVcVmzue.jpg',
    overview: 'Демо-фільм. Протистояння Бетмена і Джокера у Ґотемі.',
    genres: ['Action', 'Crime'],
    runtime: 152,
  },
  {
    id: 10003,
    title: 'Міжзоряний',
    rating: 8.5,
    year: '2014',
    poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg',
    overview: 'Демо-фільм. Подорож за межі Сонячної системи заради порятунку людства.',
    genres: ['Sci-Fi', 'Drama'],
    runtime: 169,
  },
  {
    id: 10004,
    title: 'Матриця',
    rating: 8.7,
    year: '1999',
    poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/icmmSD4vTTDKOq2vvdulafOGw93.jpg',
    overview: 'Демо-фільм. Реальність виявляється симуляцією.',
    genres: ['Sci-Fi', 'Action'],
    runtime: 136,
  },
  {
    id: 10005,
    title: 'Дюна',
    rating: 8.1,
    year: '2021',
    poster: 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/iopYFB1b6Bh7FWZh3onQhph1sih.jpg',
    overview: 'Демо-фільм. Боротьба за контроль над найціннішим ресурсом галактики.',
    genres: ['Sci-Fi', 'Adventure'],
    runtime: 155,
  },
];

const DEMO_TV = [
  {
    id: 20001,
    title: 'Чорнобиль',
    rating: 9.2,
    year: '2019',
    poster: 'https://image.tmdb.org/t/p/w500/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/900tHlUYUkp7Ol04XFSoAaEIXcT.jpg',
    overview: 'Демо-серіал. Історія аварії та її наслідків.',
    genres: ['Drama', 'History'],
    runtime: 60,
  },
  {
    id: 20002,
    title: 'Останні з нас',
    rating: 8.9,
    year: '2023',
    poster: 'https://image.tmdb.org/t/p/w500/uKvVjHNqB5VmOrdxqAt2F7J78ED.jpg',
    backdrop: 'https://image.tmdb.org/t/p/original/uDgy6hyPd82kOHh6I95FLtLnj6p.jpg',
    overview: 'Демо-серіал. Подорож у постапокаліптичному світі.',
    genres: ['Drama', 'Sci-Fi'],
    runtime: 58,
  },
  {
    id: 20003,
    title: 'Шерлок',
    rating: 9.1,
    year: '2010',
    poster: 'https://image.tmdb.org/t/p/w500/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg',
    backdrop: 'https://image.tmdb.org/t/p/w500/7WTsnHkbA0FaG6R9twfFde0I9hl.jpg',
    overview: 'Демо-серіал. Сучасне переосмислення класичного детективу.',
    genres: ['Crime', 'Mystery'],
    runtime: 88,
  },
];

const DEMO_CAST = [
  {
    id: 1,
    name: 'Demo Actor One',
    character: 'Головний герой',
    profile: null,
  },
  {
    id: 2,
    name: 'Demo Actor Two',
    character: 'Другорядна роль',
    profile: null,
  },
  {
    id: 3,
    name: 'Demo Actor Three',
    character: 'Антагоніст',
    profile: null,
  },
];

const GENRE_NAME_TO_ID = {
  Action: 28,
  Adventure: 12,
  Animation: 16,
  Comedy: 35,
  Crime: 80,
  Documentary: 99,
  Drama: 18,
  Family: 10751,
  Fantasy: 14,
  History: 36,
  Horror: 27,
  Music: 10402,
  Mystery: 9648,
  Romance: 10749,
  'Sci-Fi': 878,
  Thriller: 53,
  War: 10752,
  Western: 37,
};

const DEFAULT_MOVIE_GENRES = [
  { id: 28, name: 'Бойовик' },
  { id: 12, name: 'Пригоди' },
  { id: 16, name: 'Анімація' },
  { id: 35, name: 'Комедія' },
  { id: 80, name: 'Кримінал' },
  { id: 99, name: 'Документальний' },
  { id: 18, name: 'Драма' },
  { id: 10751, name: 'Сімейний' },
  { id: 14, name: 'Фентезі' },
  { id: 36, name: 'Історичний' },
  { id: 27, name: 'Жахи' },
  { id: 10402, name: 'Музика' },
  { id: 9648, name: 'Детектив' },
  { id: 10749, name: 'Мелодрама' },
  { id: 878, name: 'Фантастика' },
  { id: 53, name: 'Трилер' },
  { id: 10752, name: 'Військовий' },
  { id: 37, name: 'Вестерн' },
];

const DEFAULT_TV_GENRES = [
  { id: 10759, name: 'Бойовик та пригоди' },
  { id: 16, name: 'Анімація' },
  { id: 35, name: 'Комедія' },
  { id: 80, name: 'Кримінал' },
  { id: 99, name: 'Документальний' },
  { id: 18, name: 'Драма' },
  { id: 10751, name: 'Сімейний' },
  { id: 10762, name: 'Для дітей' },
  { id: 9648, name: 'Детектив' },
  { id: 10763, name: 'Новини' },
  { id: 10764, name: 'Реаліті' },
  { id: 10765, name: 'Sci-Fi та фентезі' },
  { id: 10766, name: 'Мильна опера' },
  { id: 10767, name: 'Ток-шоу' },
  { id: 10768, name: 'Військовий та політика' },
  { id: 37, name: 'Вестерн' },
];

const MOVIE_SORT_OPTIONS = new Set([
  'popularity.desc',
  'primary_release_date.desc',
  'vote_average.desc',
  'title.asc',
]);

const TV_SORT_OPTIONS = new Set([
  'popularity.desc',
  'first_air_date.desc',
  'vote_average.desc',
  'name.asc',
]);

const WATCH_TYPE_OPTIONS = new Set(['flatrate', 'free', 'ads', 'rent', 'buy']);

function isTmdbConfigured() {
  return Boolean(tmdbApiKey);
}

function assertTmdbConfigured() {
  if (!isTmdbConfigured()) {
    const error = new Error('TMDB_API_KEY is not configured');
    error.status = 500;
    throw error;
  }
}

function mapMovieItem(movie) {
  return {
    id: movie.id,
    title: movie.title,
    poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null,
    rating: typeof movie.vote_average === 'number' ? Number(movie.vote_average.toFixed(1)) : null,
    year: movie.release_date ? String(movie.release_date).slice(0, 4) : null,
    mediaType: 'movie',
    externalUrl: null,
    channelTitle: null,
    isLive: false,
  };
}

function mapTvItem(show) {
  return {
    id: show.id,
    title: show.name,
    poster: show.poster_path ? `https://image.tmdb.org/t/p/w500${show.poster_path}` : null,
    rating: typeof show.vote_average === 'number' ? Number(show.vote_average.toFixed(1)) : null,
    year: show.first_air_date ? String(show.first_air_date).slice(0, 4) : null,
    mediaType: 'tv',
    externalUrl: null,
    channelTitle: null,
    isLive: false,
  };
}

function mapMultiItem(item) {
  if (item?.media_type === 'movie') {
    return mapMovieItem(item);
  }
  if (item?.media_type === 'tv') {
    return mapTvItem(item);
  }
  return null;
}

function mapDemoItem(item, mediaType) {
  return {
    id: item.id,
    title: item.title,
    poster: item.poster,
    rating: item.rating,
    year: item.year,
    mediaType,
    externalUrl: null,
    channelTitle: null,
    isLive: false,
  };
}

function mapCastItem(castItem) {
  return {
    id: castItem.id,
    name: castItem.name,
    character: castItem.character ?? null,
    profile: castItem.profile_path ? `https://image.tmdb.org/t/p/w185${castItem.profile_path}` : null,
  };
}

function toSearchPayload(result, mapper, extra = {}) {
  const mappedResults = Array.isArray(result.results) ? result.results.map(mapper).filter(Boolean) : [];
  return {
    page: result.page,
    totalPages: result.total_pages,
    totalResults: result.total_results,
    results: mappedResults,
    ...extra,
  };
}

async function tmdbFetch(path, params = {}) {
  assertTmdbConfigured();
  const url = new URL(`${tmdbBaseUrl}${path}`);
  url.searchParams.set('api_key', tmdbApiKey);
  url.searchParams.set('language', 'uk-UA');
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    const message = await response.text();
    const error = new Error(`TMDB request failed: ${response.status} ${message}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function buildDemoSearchPayload(items, query, page, mediaType, extra = {}) {
  const normalizedQuery = String(query ?? '').trim().toLowerCase();
  const filtered = items.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
  const totalResults = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / DEMO_PAGE_SIZE));
  const normalizedPage = Math.max(1, Math.min(page, totalPages));
  const from = (normalizedPage - 1) * DEMO_PAGE_SIZE;
  const to = from + DEMO_PAGE_SIZE;
  const results = filtered.slice(from, to).map((item) => mapDemoItem(item, mediaType));

  return {
    page: normalizedPage,
    totalPages,
    totalResults,
    results,
    demoMode: true,
    meta: {
      sourceMode: 'demo',
      reason: 'missing_tmdb_key',
      hint: 'Додайте TMDB_API_KEY у backend/.env для реального пошуку.',
    },
    ...extra,
  };
}

function buildDemoTrendingPayload(items, page, mediaType, extra = {}) {
  const totalResults = items.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / DEMO_PAGE_SIZE));
  const normalizedPage = Math.max(1, Math.min(page, totalPages));
  const from = (normalizedPage - 1) * DEMO_PAGE_SIZE;
  const to = from + DEMO_PAGE_SIZE;
  const results = items.slice(from, to).map((item) => mapDemoItem(item, mediaType));

  return {
    page: normalizedPage,
    totalPages,
    totalResults,
    results,
    demoMode: true,
    meta: {
      sourceMode: 'demo',
      reason: 'missing_tmdb_key',
      hint: 'Додайте TMDB_API_KEY у backend/.env для реальних трендів.',
    },
    ...extra,
  };
}

function normalizeWatchProviders(payload) {
  const data = payload?.results ?? {};
  const regionCandidates = [watchRegion, 'US', 'GB'];
  const selectedRegion = regionCandidates.find((region) => data[region]);
  const countryData = selectedRegion ? data[selectedRegion] : null;

  if (!countryData) {
    return {
      region: null,
      link: null,
      items: [],
    };
  }

  const collections = [
    { key: 'flatrate', type: 'subscription' },
    { key: 'rent', type: 'rent' },
    { key: 'buy', type: 'buy' },
  ];

  const unique = new Map();
  collections.forEach((collection) => {
    const providers = Array.isArray(countryData[collection.key]) ? countryData[collection.key] : [];
    providers.forEach((provider) => {
      const mapKey = `${provider.provider_id}:${collection.type}`;
      if (unique.has(mapKey)) {
        return;
      }

      unique.set(mapKey, {
        providerId: provider.provider_id,
        providerName: provider.provider_name,
        logo: provider.logo_path ? `https://image.tmdb.org/t/p/w185${provider.logo_path}` : null,
        type: collection.type,
      });
    });
  });

  return {
    region: selectedRegion,
    link: countryData.link ?? null,
    items: [...unique.values()],
  };
}

function demoWatchProviders() {
  return {
    region: watchRegion,
    link: null,
    items: [
      {
        providerId: 1,
        providerName: 'Demo Stream+',
        logo: null,
        type: 'subscription',
      },
      {
        providerId: 2,
        providerName: 'Demo Rent TV',
        logo: null,
        type: 'rent',
      },
    ],
  };
}

function normalizeCatalogType(type) {
  return type === 'tv' ? 'tv' : 'movie';
}

function normalizeMovieCategory(category) {
  const normalized = String(category ?? '').trim().toLowerCase();
  if (['popular', 'now_playing', 'upcoming', 'top_rated'].includes(normalized)) {
    return normalized;
  }
  return 'popular';
}

function normalizeTvCategory(category) {
  const normalized = String(category ?? '').trim().toLowerCase();
  if (['popular', 'airing_today', 'on_the_air', 'top_rated'].includes(normalized)) {
    return normalized;
  }
  return 'popular';
}

function normalizeCatalogSort(type, sort) {
  const normalized = String(sort ?? '').trim().toLowerCase();
  if (type === 'tv') {
    return TV_SORT_OPTIONS.has(normalized) ? normalized : 'popularity.desc';
  }
  return MOVIE_SORT_OPTIONS.has(normalized) ? normalized : 'popularity.desc';
}

function normalizeNumberRange(value, min, max) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return null;
  }
  return Math.max(min, Math.min(max, num));
}

function normalizeYear(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const digits = String(value).replace(/\D/g, '').slice(0, 4);
  if (digits.length !== 4) {
    return null;
  }
  return digits;
}

function normalizeGenreIds(value) {
  if (value === null || value === undefined || value === '') {
    return [];
  }
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  const parts = raw.split(',').map((part) => Number(part.trim())).filter((num) => Number.isFinite(num));
  return [...new Set(parts.map((num) => Math.floor(num)))];
}

function normalizeWatchTypes(value) {
  if (value === null || value === undefined || value === '') {
    return [];
  }
  const raw = Array.isArray(value) ? value.join(',') : String(value);
  const parts = raw.split(',').map((part) => part.trim().toLowerCase()).filter(Boolean);
  return [...new Set(parts.filter((part) => WATCH_TYPE_OPTIONS.has(part)))];
}

function applyDemoCatalogFilters(items, filters) {
  const { genreIds, minRating, yearFrom, yearTo, onlyWithPoster } = filters;
  return items.filter((item) => {
    if (onlyWithPoster && !item.poster) {
      return false;
    }
    if (minRating !== null && Number(item.rating ?? -1) < minRating) {
      return false;
    }
    if (yearFrom && Number(item.year ?? 0) < Number(yearFrom)) {
      return false;
    }
    if (yearTo && Number(item.year ?? 9999) > Number(yearTo)) {
      return false;
    }
    if (genreIds.length > 0) {
      const itemGenreIds = (item.genres ?? [])
        .map((genreName) => GENRE_NAME_TO_ID[genreName] ?? null)
        .filter((id) => Number.isFinite(id));
      if (!genreIds.some((genreId) => itemGenreIds.includes(genreId))) {
        return false;
      }
    }
    return true;
  });
}

function sortDemoCatalogItems(items, sort, type) {
  const sorted = [...items];
  if (sort === 'vote_average.desc') {
    sorted.sort((a, b) => Number(b.rating ?? -1) - Number(a.rating ?? -1));
    return sorted;
  }
  if (sort === 'title.asc' || sort === 'name.asc') {
    sorted.sort((a, b) => String(a.title ?? '').localeCompare(String(b.title ?? ''), 'uk'));
    return sorted;
  }
  if (sort === 'primary_release_date.desc' || sort === 'first_air_date.desc') {
    sorted.sort((a, b) => Number(b.year ?? 0) - Number(a.year ?? 0));
    return sorted;
  }
  if (type === 'movie') {
    sorted.sort((a, b) => Number(b.rating ?? -1) - Number(a.rating ?? -1));
    return sorted;
  }
  return sorted;
}

function paginateDemoCatalog(items, page, mediaType, meta) {
  const totalResults = items.length;
  const totalPages = Math.max(1, Math.ceil(totalResults / DEMO_PAGE_SIZE));
  const normalizedPage = Math.max(1, Math.min(page, totalPages));
  const from = (normalizedPage - 1) * DEMO_PAGE_SIZE;
  const to = from + DEMO_PAGE_SIZE;
  const results = items.slice(from, to).map((item) => mapDemoItem(item, mediaType));

  return {
    page: normalizedPage,
    totalPages,
    totalResults,
    results,
    demoMode: true,
    meta: {
      sourceMode: 'demo',
      reason: 'missing_tmdb_key',
      hint: 'Додайте TMDB_API_KEY у backend/.env для реального каталогу.',
      ...meta,
    },
    source: 'catalog',
    searchType: mediaType,
  };
}

async function searchCatalog(query, page = 1, type = 'movie') {
  const normalizedType = type === 'tv' || type === 'multi' ? type : 'movie';

  if (!isTmdbConfigured()) {
    if (normalizedType === 'tv') {
      return buildDemoSearchPayload(DEMO_TV, query, page, 'tv', {
        source: 'search',
        searchType: 'tv',
      });
    }
    if (normalizedType === 'multi') {
      const combined = [
        ...DEMO_MOVIES.map((item) => ({ ...item, mediaType: 'movie' })),
        ...DEMO_TV.map((item) => ({ ...item, mediaType: 'tv' })),
      ];
      const normalizedQuery = String(query ?? '').trim().toLowerCase();
      const filtered = combined.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
      return {
        page: 1,
        totalPages: 1,
        totalResults: filtered.length,
        results: filtered.slice(0, DEMO_PAGE_SIZE).map((item) => mapDemoItem(item, item.mediaType)),
        demoMode: true,
        meta: {
          sourceMode: 'demo',
          reason: 'missing_tmdb_key',
          hint: 'Додайте TMDB_API_KEY у backend/.env для реального multi-пошуку.',
        },
        source: 'search',
        searchType: 'multi',
      };
    }

    return buildDemoSearchPayload(DEMO_MOVIES, query, page, 'movie', {
      source: 'search',
      searchType: 'movie',
    });
  }

  const key = `search:${normalizedType}:${query}:${page}`;
  const fromCache = cache.get(key);
  if (fromCache) {
    return fromCache;
  }

  let result;
  let mapper;
  if (normalizedType === 'tv') {
    result = await tmdbFetch('/search/tv', { query, page, include_adult: false });
    mapper = mapTvItem;
  } else if (normalizedType === 'multi') {
    result = await tmdbFetch('/search/multi', { query, page, include_adult: false });
    mapper = mapMultiItem;
  } else {
    result = await tmdbFetch('/search/movie', { query, page, include_adult: false });
    mapper = mapMovieItem;
  }

  const normalized = toSearchPayload(result, mapper, {
    meta: {
      sourceMode: 'real',
      reason: null,
      hint: null,
    },
    source: 'search',
    searchType: normalizedType,
  });
  cache.set(key, normalized, 60 * 30);
  return normalized;
}

async function searchMovies(query, page = 1) {
  return searchCatalog(query, page, 'movie');
}

async function getTrendingMovies(page = 1, type = 'movie') {
  const normalizedType = type === 'tv' ? 'tv' : 'movie';

  if (!isTmdbConfigured()) {
    return buildDemoTrendingPayload(normalizedType === 'tv' ? DEMO_TV : DEMO_MOVIES, page, normalizedType, {
      source: 'trending',
      searchType: normalizedType,
    });
  }

  const key = `trending:${normalizedType}:${page}`;
  const fromCache = cache.get(key);
  if (fromCache) {
    return fromCache;
  }

  const path = normalizedType === 'tv' ? '/trending/tv/day' : '/trending/movie/day';
  const result = await tmdbFetch(path, { page });
  const mapper = normalizedType === 'tv' ? mapTvItem : mapMovieItem;
  const normalized = toSearchPayload(result, mapper, {
    meta: {
      sourceMode: 'real',
      reason: null,
      hint: null,
    },
    source: 'trending',
    searchType: normalizedType,
  });
  cache.set(key, normalized, 60 * 20);
  return normalized;
}

async function getGenres(type = 'movie') {
  const normalizedType = normalizeCatalogType(type);
  if (!isTmdbConfigured()) {
    return {
      type: normalizedType,
      items: normalizedType === 'tv' ? DEFAULT_TV_GENRES : DEFAULT_MOVIE_GENRES,
      demoMode: true,
      sourceMode: 'demo',
    };
  }

  const key = `genres:${normalizedType}`;
  const fromCache = cache.get(key);
  if (fromCache) {
    return fromCache;
  }

  const result = await tmdbFetch(`/genre/${normalizedType}/list`);
  const payload = {
    type: normalizedType,
    items: Array.isArray(result.genres)
      ? result.genres
          .filter((item) => Number.isFinite(Number(item?.id)) && typeof item?.name === 'string')
          .map((item) => ({ id: Number(item.id), name: item.name }))
      : [],
    demoMode: false,
    sourceMode: 'real',
  };
  cache.set(key, payload, 60 * 60 * 12);
  return payload;
}

async function browseCatalog(options = {}) {
  const type = normalizeCatalogType(options.type);
  const page = Number.isFinite(Number(options.page)) ? Math.max(1, Number(options.page)) : 1;
  const category = type === 'tv' ? normalizeTvCategory(options.category) : normalizeMovieCategory(options.category);
  const sortBy = normalizeCatalogSort(type, options.sort);
  const minRating = normalizeNumberRange(options.minRating, 0, 10);
  const yearFrom = normalizeYear(options.yearFrom);
  const yearTo = normalizeYear(options.yearTo);
  const genreIds = normalizeGenreIds(options.genres);
  const watchTypes = normalizeWatchTypes(options.watchTypes);
  const onlyWithPoster = options.onlyWithPoster === true || String(options.onlyWithPoster).toLowerCase() === 'true';

  if (!isTmdbConfigured()) {
    const demoItems = type === 'tv' ? DEMO_TV : DEMO_MOVIES;
    const filtered = applyDemoCatalogFilters(demoItems, {
      genreIds,
      minRating,
      yearFrom,
      yearTo,
      onlyWithPoster,
    });
    const sorted = sortDemoCatalogItems(filtered, sortBy, type);
    return paginateDemoCatalog(sorted, page, type, {
      category,
    });
  }

  const key = `catalog:${type}:${category}:${page}:${sortBy}:${minRating ?? ''}:${yearFrom ?? ''}:${yearTo ?? ''}:${genreIds.join(',')}:${watchTypes.join(',')}:${onlyWithPoster ? '1' : '0'}`;
  const fromCache = cache.get(key);
  if (fromCache) {
    return fromCache;
  }

  const today = new Date().toISOString().slice(0, 10);
  const discoverParams = {
    page,
    sort_by: sortBy,
    include_adult: false,
    include_null_first_air_dates: false,
    'vote_average.gte': minRating ?? undefined,
    with_genres: genreIds.length > 0 ? genreIds.join(',') : undefined,
    with_watch_monetization_types: watchTypes.length > 0 ? watchTypes.join('|') : undefined,
    watch_region: watchTypes.length > 0 ? watchRegion : undefined,
  };

  if (type === 'movie') {
    discoverParams['primary_release_date.gte'] = yearFrom ? `${yearFrom}-01-01` : undefined;
    discoverParams['primary_release_date.lte'] = yearTo ? `${yearTo}-12-31` : undefined;
    if (category === 'now_playing') {
      discoverParams['primary_release_date.lte'] = today;
      if (!discoverParams['primary_release_date.gte']) {
        const start = new Date();
        start.setDate(start.getDate() - 120);
        discoverParams['primary_release_date.gte'] = start.toISOString().slice(0, 10);
      }
    } else if (category === 'upcoming') {
      discoverParams['primary_release_date.gte'] = today;
    } else if (category === 'top_rated' && !options.sort) {
      discoverParams.sort_by = 'vote_average.desc';
    }
  } else {
    discoverParams['first_air_date.gte'] = yearFrom ? `${yearFrom}-01-01` : undefined;
    discoverParams['first_air_date.lte'] = yearTo ? `${yearTo}-12-31` : undefined;
    if (category === 'airing_today') {
      discoverParams['air_date.gte'] = today;
      discoverParams['air_date.lte'] = today;
    } else if (category === 'on_the_air') {
      discoverParams['air_date.gte'] = today;
    } else if (category === 'top_rated' && !options.sort) {
      discoverParams.sort_by = 'vote_average.desc';
    }
  }

  const path = type === 'tv' ? '/discover/tv' : '/discover/movie';
  const result = await tmdbFetch(path, discoverParams);
  const mapper = type === 'tv' ? mapTvItem : mapMovieItem;
  const normalized = toSearchPayload(result, mapper, {
    meta: {
      sourceMode: 'real',
      reason: null,
      hint: null,
      category,
    },
    source: 'catalog',
    searchType: type,
  });

  cache.set(key, normalized, 60 * 15);
  return normalized;
}

async function getMovieDetails(id) {
  if (!isTmdbConfigured()) {
    const item = DEMO_MOVIES.find((movie) => movie.id === Number(id));
    if (!item) {
      const error = new Error('Movie not found in demo catalog');
      error.status = 404;
      throw error;
    }

    return {
      id: item.id,
      mediaType: 'movie',
      title: item.title,
      poster: item.poster,
      backdrop: item.backdrop ?? item.poster,
      rating: item.rating,
      year: item.year,
      overview: item.overview,
      genres: item.genres,
      runtime: item.runtime,
      trailerUrl: null,
      trailerEmbedUrl: null,
      watchProviders: demoWatchProviders(),
      cast: DEMO_CAST,
      similar: DEMO_MOVIES.filter((movie) => movie.id !== item.id)
        .slice(0, 4)
        .map((movie) => mapDemoItem(movie, 'movie')),
      demoMode: true,
      sourceMode: 'demo',
    };
  }

  const key = `details:movie:${id}`;
  const fromCache = cache.get(key);
  if (fromCache) {
    return fromCache;
  }

  const [details, videos, watchProvidersPayload, credits, similarPayload] = await Promise.all([
    tmdbFetch(`/movie/${id}`),
    tmdbFetch(`/movie/${id}/videos`),
    tmdbFetch(`/movie/${id}/watch/providers`),
    tmdbFetch(`/movie/${id}/credits`),
    tmdbFetch(`/movie/${id}/recommendations`),
  ]);

  const trailer = Array.isArray(videos.results)
    ? videos.results.find((video) => video.site === 'YouTube' && video.type === 'Trailer')
    : null;

  const normalized = {
    id: details.id,
    mediaType: 'movie',
    title: details.title,
    poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
    backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null,
    rating: typeof details.vote_average === 'number' ? Number(details.vote_average.toFixed(1)) : null,
    year: details.release_date ? String(details.release_date).slice(0, 4) : null,
    overview: details.overview ?? '',
    genres: Array.isArray(details.genres) ? details.genres.map((genre) => genre.name) : [],
    runtime: details.runtime ?? null,
    trailerUrl: trailer?.key ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    trailerEmbedUrl: trailer?.key ? `https://www.youtube.com/embed/${trailer.key}` : null,
    watchProviders: normalizeWatchProviders(watchProvidersPayload),
    cast: Array.isArray(credits.cast) ? credits.cast.slice(0, 12).map(mapCastItem) : [],
    similar: Array.isArray(similarPayload.results) ? similarPayload.results.slice(0, 8).map(mapMovieItem) : [],
    sourceMode: 'real',
  };

  cache.set(key, normalized, 60 * 60 * 6);
  return normalized;
}

async function getTvDetails(id) {
  if (!isTmdbConfigured()) {
    const item = DEMO_TV.find((show) => show.id === Number(id));
    if (!item) {
      const error = new Error('TV show not found in demo catalog');
      error.status = 404;
      throw error;
    }

    return {
      id: item.id,
      mediaType: 'tv',
      title: item.title,
      poster: item.poster,
      backdrop: item.backdrop ?? item.poster,
      rating: item.rating,
      year: item.year,
      overview: item.overview,
      genres: item.genres,
      runtime: item.runtime,
      trailerUrl: null,
      trailerEmbedUrl: null,
      watchProviders: demoWatchProviders(),
      cast: DEMO_CAST,
      similar: DEMO_TV.filter((show) => show.id !== item.id)
        .slice(0, 4)
        .map((show) => mapDemoItem(show, 'tv')),
      demoMode: true,
      sourceMode: 'demo',
    };
  }

  const key = `details:tv:${id}`;
  const fromCache = cache.get(key);
  if (fromCache) {
    return fromCache;
  }

  const [details, videos, watchProvidersPayload, credits, similarPayload] = await Promise.all([
    tmdbFetch(`/tv/${id}`),
    tmdbFetch(`/tv/${id}/videos`),
    tmdbFetch(`/tv/${id}/watch/providers`),
    tmdbFetch(`/tv/${id}/credits`),
    tmdbFetch(`/tv/${id}/recommendations`),
  ]);

  const trailer = Array.isArray(videos.results)
    ? videos.results.find((video) => video.site === 'YouTube' && video.type === 'Trailer')
    : null;
  const runtime = Array.isArray(details.episode_run_time) && details.episode_run_time.length > 0
    ? details.episode_run_time[0]
    : null;

  const normalized = {
    id: details.id,
    mediaType: 'tv',
    title: details.name,
    poster: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
    backdrop: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null,
    rating: typeof details.vote_average === 'number' ? Number(details.vote_average.toFixed(1)) : null,
    year: details.first_air_date ? String(details.first_air_date).slice(0, 4) : null,
    overview: details.overview ?? '',
    genres: Array.isArray(details.genres) ? details.genres.map((genre) => genre.name) : [],
    runtime,
    trailerUrl: trailer?.key ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    trailerEmbedUrl: trailer?.key ? `https://www.youtube.com/embed/${trailer.key}` : null,
    watchProviders: normalizeWatchProviders(watchProvidersPayload),
    cast: Array.isArray(credits.cast) ? credits.cast.slice(0, 12).map(mapCastItem) : [],
    similar: Array.isArray(similarPayload.results) ? similarPayload.results.slice(0, 8).map(mapTvItem) : [],
    sourceMode: 'real',
  };

  cache.set(key, normalized, 60 * 60 * 6);
  return normalized;
}

function getTmdbCacheStats() {
  return cache.getStats();
}

function clearTmdbCache() {
  const before = cache.getStats();
  cache.flushAll();
  return {
    before,
    after: cache.getStats(),
  };
}

module.exports = {
  searchMovies,
  searchCatalog,
  browseCatalog,
  getGenres,
  getTrendingMovies,
  getMovieDetails,
  getTvDetails,
  getTmdbCacheStats,
  clearTmdbCache,
};
