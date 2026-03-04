const {
  browseCatalog,
  getGenres,
  searchCatalog,
  getTrendingMovies,
  getMovieDetails,
  getTvDetails,
} = require('../tmdb');
const { searchExternalContent } = require('../videoPlatforms');
const { setNoStoreHeaders } = require('../cacheHeaders');

function parsePage(value) {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) {
    return 1;
  }
  return Math.floor(page);
}

function parseSearchType(value) {
  const normalized = String(value ?? 'movie').trim().toLowerCase();
  const allowed = ['movie', 'tv', 'multi', 'youtube', 'twitch'];
  return allowed.includes(normalized) ? normalized : null;
}

function registerContentRoutes({ app, googleClientId, isSourceConfigured }) {
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'movie-api' });
  });

  app.get('/api/config/status', (_req, res) => {
    setNoStoreHeaders(res);
    res.json({
      sources: {
        tmdb: {
          configured: isSourceConfigured('tmdb'),
          mode: isSourceConfigured('tmdb') ? 'real' : 'demo',
        },
        youtube: {
          configured: isSourceConfigured('youtube'),
          mode: isSourceConfigured('youtube') ? 'real' : 'demo',
        },
        twitch: {
          configured: isSourceConfigured('twitch'),
          mode: isSourceConfigured('twitch') ? 'real' : 'demo',
        },
      },
      google: {
        configured: Boolean(googleClientId),
      },
    });
  });

  app.get('/api/search', async (req, res, next) => {
    try {
      const page = parsePage(req.query.page);
      const searchType = parseSearchType(req.query.type);
      if (!searchType) {
        return res.status(400).json({ error: 'Invalid search type' });
      }
      const query = String(req.query.query ?? '').trim();

      if (searchType === 'youtube' || searchType === 'twitch') {
        const result = await searchExternalContent(query, page, searchType);
        return res.json(result);
      }

      if (!query) {
        return res.status(400).json({ error: 'query is required' });
      }

      const result = await searchCatalog(query, page, searchType);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/genres', async (req, res, next) => {
    try {
      const type = String(req.query.type ?? 'movie').trim().toLowerCase();
      if (type !== 'movie' && type !== 'tv') {
        return res.status(400).json({ error: 'type must be movie or tv' });
      }
      const result = await getGenres(type);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/catalog', async (req, res, next) => {
    try {
      const page = parsePage(req.query.page);
      const type = String(req.query.type ?? 'movie').trim().toLowerCase();
      if (type !== 'movie' && type !== 'tv') {
        return res.status(400).json({ error: 'type must be movie or tv' });
      }

      const result = await browseCatalog({
        page,
        type,
        category: req.query.category,
        sort: req.query.sort,
        minRating: req.query.minRating,
        yearFrom: req.query.yearFrom,
        yearTo: req.query.yearTo,
        genres: req.query.genres,
        watchTypes: req.query.watchTypes,
        onlyWithPoster: req.query.onlyWithPoster,
      });

      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/trending', async (req, res, next) => {
    try {
      const page = parsePage(req.query.page);
      const type = String(req.query.type ?? 'movie').trim().toLowerCase();
      if (type !== 'movie' && type !== 'tv') {
        return res.status(400).json({ error: 'Trending supports only movie or tv' });
      }

      const result = await getTrendingMovies(page, type);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/movie/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'Invalid movie id' });
      }

      const result = await getMovieDetails(id);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/tv/:id', async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: 'Invalid tv id' });
      }

      const result = await getTvDetails(id);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });
}

module.exports = {
  registerContentRoutes,
};
