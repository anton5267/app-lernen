const NodeCache = require('node-cache');
const { youtubeApiKey, twitchClientId, twitchClientSecret } = require('./config');

const cache = new NodeCache({ stdTTL: 60 * 30, checkperiod: 120 });
const DEMO_PAGE_SIZE = 10;

const DEMO_YOUTUBE = [
  {
    id: 'yt-demo-trailer-1',
    title: 'Movie Finder Demo Trailer',
    poster: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    year: '2026',
    channelTitle: 'Movie Finder Channel',
    externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  },
  {
    id: 'yt-demo-review-1',
    title: 'Огляд серіалу: Демо епізод',
    poster: 'https://i.ytimg.com/vi/oHg5SJYRHA0/hqdefault.jpg',
    year: '2026',
    channelTitle: 'Demo Reviews UA',
    externalUrl: 'https://www.youtube.com/watch?v=oHg5SJYRHA0',
  },
];

const DEMO_TWITCH = [
  {
    id: 'tw-demo-1',
    title: 'DemoStreamerUA',
    poster: 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png',
    channelTitle: 'demostreamerua',
    externalUrl: 'https://www.twitch.tv/demostreamerua',
    isLive: true,
  },
  {
    id: 'tw-demo-2',
    title: 'MovieTalkLive',
    poster: 'https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_70x70.png',
    channelTitle: 'movietalklive',
    externalUrl: 'https://www.twitch.tv/movietalklive',
    isLive: false,
  },
];

function toExternalPayload(results, type, extra = {}) {
  const configured = type === 'youtube' ? Boolean(youtubeApiKey) : Boolean(twitchClientId && twitchClientSecret);
  const sourceMode = configured ? 'real' : 'demo';
  return {
    page: 1,
    totalPages: 1,
    totalResults: results.length,
    results,
    source: type,
    searchType: type,
    meta: {
      sourceMode,
      reason: null,
      hint: null,
    },
    ...extra,
  };
}

function mapYouTubeItem(item) {
  return {
    id: item.id?.videoId ?? '',
    title: item.snippet?.title ?? 'YouTube video',
    poster: item.snippet?.thumbnails?.high?.url ?? item.snippet?.thumbnails?.default?.url ?? null,
    rating: null,
    year: item.snippet?.publishedAt ? String(item.snippet.publishedAt).slice(0, 4) : null,
    mediaType: 'youtube',
    externalUrl: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : null,
    channelTitle: item.snippet?.channelTitle ?? null,
    isLive: item.snippet?.liveBroadcastContent === 'live',
  };
}

function mapTwitchItem(item) {
  const login = item.broadcaster_login ?? item.display_name ?? '';
  const thumbnail = item.thumbnail_url
    ? item.thumbnail_url.replace('{width}', '640').replace('{height}', '360')
    : null;

  return {
    id: item.id ?? item.broadcaster_id ?? login,
    title: item.display_name ?? login,
    poster: thumbnail,
    rating: null,
    year: item.started_at ? String(item.started_at).slice(0, 4) : null,
    mediaType: 'twitch',
    externalUrl: login ? `https://www.twitch.tv/${login}` : null,
    channelTitle: login || null,
    isLive: Boolean(item.is_live),
  };
}

function filterAndSliceDemo(list, query, mediaType) {
  const normalizedQuery = String(query ?? '').trim().toLowerCase();
  const filtered = list.filter((item) => item.title.toLowerCase().includes(normalizedQuery));
  return filtered.slice(0, DEMO_PAGE_SIZE).map((item) => ({
    id: item.id,
    title: item.title,
    poster: item.poster,
    rating: null,
    year: item.year ?? null,
    mediaType,
    externalUrl: item.externalUrl,
    channelTitle: item.channelTitle,
    isLive: Boolean(item.isLive),
  }));
}

async function searchYouTube(query, _page = 1) {
  const normalizedQuery = String(query ?? '').trim();

  if (!youtubeApiKey) {
    const results = filterAndSliceDemo(DEMO_YOUTUBE, normalizedQuery, 'youtube');
    return toExternalPayload(results, 'youtube', {
      demoMode: true,
      meta: {
        sourceMode: 'demo',
        reason: normalizedQuery ? 'missing_youtube_key' : 'demo_recommendations',
        hint: 'Додайте YOUTUBE_API_KEY у backend/.env для реальних відео YouTube.',
      },
    });
  }

  if (!normalizedQuery) {
    return toExternalPayload([], 'youtube', {
      demoMode: false,
      meta: {
        sourceMode: 'real',
        reason: 'query_required',
        hint: 'Введіть пошуковий запит для YouTube.',
      },
    });
  }

  const key = `youtube:${normalizedQuery}`;
  const fromCache = cache.get(key);
  if (fromCache) {
    return fromCache;
  }

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('maxResults', '20');
  url.searchParams.set('q', normalizedQuery);
  url.searchParams.set('relevanceLanguage', 'uk');
  url.searchParams.set('key', youtubeApiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    const message = await response.text();
    const error = new Error(`YouTube request failed: ${response.status} ${message}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const results = Array.isArray(payload.items)
    ? payload.items.map(mapYouTubeItem).filter((item) => Boolean(item.id))
    : [];

  const normalized = toExternalPayload(results, 'youtube', {
    demoMode: false,
    meta: {
      sourceMode: 'real',
      reason: results.length === 0 ? 'no_results' : null,
      hint: results.length === 0 ? 'Спробуйте інший запит для YouTube.' : null,
    },
  });
  cache.set(key, normalized, 60 * 15);
  return normalized;
}

async function getTwitchAppToken() {
  const cached = cache.get('twitch:app-token');
  if (cached) {
    return cached;
  }

  if (!twitchClientId || !twitchClientSecret) {
    return null;
  }

  const params = new URLSearchParams();
  params.set('client_id', twitchClientId);
  params.set('client_secret', twitchClientSecret);
  params.set('grant_type', 'client_credentials');

  const response = await fetch('https://id.twitch.tv/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(`Twitch token request failed: ${response.status} ${message}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const token = payload.access_token;
  const expiresIn = Number(payload.expires_in);
  if (!token || !Number.isFinite(expiresIn)) {
    const error = new Error('Invalid Twitch token response');
    error.status = 500;
    throw error;
  }

  cache.set('twitch:app-token', token, Math.max(60, expiresIn - 120));
  return token;
}

async function searchTwitch(query, _page = 1) {
  const normalizedQuery = String(query ?? '').trim();

  if (!twitchClientId || !twitchClientSecret) {
    const results = filterAndSliceDemo(DEMO_TWITCH, normalizedQuery, 'twitch');
    return toExternalPayload(results, 'twitch', {
      demoMode: true,
      meta: {
        sourceMode: 'demo',
        reason: normalizedQuery ? 'missing_twitch_key' : 'demo_recommendations',
        hint: 'Додайте TWITCH_CLIENT_ID та TWITCH_CLIENT_SECRET у backend/.env для реальних каналів.',
      },
    });
  }

  if (!normalizedQuery) {
    return toExternalPayload([], 'twitch', {
      demoMode: false,
      meta: {
        sourceMode: 'real',
        reason: 'query_required',
        hint: 'Введіть пошуковий запит для Twitch.',
      },
    });
  }

  const key = `twitch:${normalizedQuery}`;
  const fromCache = cache.get(key);
  if (fromCache) {
    return fromCache;
  }

  const token = await getTwitchAppToken();
  if (!token) {
    const results = filterAndSliceDemo(DEMO_TWITCH, normalizedQuery, 'twitch');
    return toExternalPayload(results, 'twitch', {
      demoMode: true,
      meta: {
        sourceMode: 'demo',
        reason: 'missing_twitch_key',
        hint: 'Додайте TWITCH_CLIENT_ID та TWITCH_CLIENT_SECRET у backend/.env для реальних каналів.',
      },
    });
  }

  const url = new URL('https://api.twitch.tv/helix/search/channels');
  url.searchParams.set('query', normalizedQuery);
  url.searchParams.set('first', '20');

  const response = await fetch(url.toString(), {
    headers: {
      'Client-Id': twitchClientId,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(`Twitch request failed: ${response.status} ${message}`);
    error.status = response.status;
    throw error;
  }

  const payload = await response.json();
  const results = Array.isArray(payload.data) ? payload.data.map(mapTwitchItem) : [];
  const normalized = toExternalPayload(results, 'twitch', {
    demoMode: false,
    meta: {
      sourceMode: 'real',
      reason: results.length === 0 ? 'no_results' : null,
      hint: results.length === 0 ? 'Спробуйте інший запит для Twitch.' : null,
    },
  });
  cache.set(key, normalized, 60 * 5);
  return normalized;
}

async function searchExternalContent(query, page, type) {
  if (type === 'youtube') {
    return searchYouTube(query, page);
  }
  if (type === 'twitch') {
    return searchTwitch(query, page);
  }

  const error = new Error('Unsupported external search type');
  error.status = 400;
  throw error;
}

function getVideoPlatformsCacheStats() {
  return cache.getStats();
}

function clearVideoPlatformsCache() {
  const before = cache.getStats();
  cache.flushAll();
  return {
    before,
    after: cache.getStats(),
  };
}

module.exports = {
  searchExternalContent,
  getVideoPlatformsCacheStats,
  clearVideoPlatformsCache,
};
