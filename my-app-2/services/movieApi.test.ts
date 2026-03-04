import { SearchResponse } from '@/types/api';

import { apiFetch } from './apiClient';
import { clearClientReadCache, searchMovies } from './movieApi';

jest.mock('./apiClient', () => ({
  API_BASE_URL: 'http://localhost:4000',
  apiFetch: jest.fn(),
}));

function buildSearchResponse(tag: string): SearchResponse {
  return {
    page: 1,
    totalPages: 1,
    totalResults: 1,
    results: [
      {
        id: 1,
        title: `Result ${tag}`,
        poster: null,
        rating: 8.1,
        year: '2026',
        mediaType: 'movie',
        externalUrl: null,
        channelTitle: null,
        isLive: false,
      },
    ],
    meta: {
      sourceMode: 'real',
      reason: null,
      hint: null,
      category: null,
    },
  };
}

describe('movieApi read cache', () => {
  beforeEach(() => {
    clearClientReadCache();
    jest.clearAllMocks();
  });

  it('uses cached value for repeated search request', async () => {
    const payload = buildSearchResponse('cached');
    (apiFetch as jest.Mock).mockResolvedValue(payload);

    const first = await searchMovies('batman', 1, 'movie');
    const second = await searchMovies('batman', 1, 'movie');

    expect(first).toEqual(payload);
    expect(second).toEqual(payload);
    expect(apiFetch).toHaveBeenCalledTimes(1);
  });

  it('deduplicates in-flight requests when signal is not provided', async () => {
    const payload = buildSearchResponse('inflight');
    let resolveFetch!: (value: SearchResponse) => void;
    const pending = new Promise<SearchResponse>((resolve) => {
      resolveFetch = resolve;
    });
    (apiFetch as jest.Mock).mockReturnValue(pending);

    const firstPromise = searchMovies('dune', 1, 'movie');
    const secondPromise = searchMovies('dune', 1, 'movie');

    expect(apiFetch).toHaveBeenCalledTimes(1);

    resolveFetch(payload);

    await expect(firstPromise).resolves.toEqual(payload);
    await expect(secondPromise).resolves.toEqual(payload);
  });

  it('isolates requests with AbortSignal to prevent cross-cancel', async () => {
    const secondPayload = buildSearchResponse('signal');
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';

    let callNumber = 0;
    (apiFetch as jest.Mock).mockImplementation((_endpoint: string, options?: { signal?: AbortSignal }) => {
      callNumber += 1;

      if (callNumber === 1) {
        return new Promise<SearchResponse>((_resolve, reject) => {
          const rejectOnAbort = () => reject(abortError);
          if (options?.signal?.aborted) {
            rejectOnAbort();
            return;
          }
          options?.signal?.addEventListener('abort', rejectOnAbort, { once: true });
        });
      }

      return Promise.resolve(secondPayload);
    });

    const firstController = new AbortController();
    const secondController = new AbortController();

    const firstPromise = searchMovies('interstellar', 1, 'movie', firstController.signal);
    const secondPromise = searchMovies('interstellar', 1, 'movie', secondController.signal);

    firstController.abort();

    await expect(firstPromise).rejects.toMatchObject({ name: 'AbortError' });
    await expect(secondPromise).resolves.toEqual(secondPayload);
    expect(apiFetch).toHaveBeenCalledTimes(2);
  });

  it('evicts oldest cache entries when max size is exceeded', async () => {
    (apiFetch as jest.Mock).mockImplementation((endpoint: string) => {
      const params = new URLSearchParams(endpoint.split('?')[1] ?? '');
      const query = params.get('query') ?? 'unknown';
      return Promise.resolve(buildSearchResponse(query));
    });

    for (let index = 0; index < 260; index += 1) {
      // Exceed cache capacity (250) to evict oldest entries.
      // eslint-disable-next-line no-await-in-loop
      await searchMovies(`cache-${index}`, 1, 'movie');
    }

    expect(apiFetch).toHaveBeenCalledTimes(260);

    await searchMovies('cache-0', 1, 'movie');

    // First inserted key should be evicted and fetched again.
    expect(apiFetch).toHaveBeenCalledTimes(261);
  });
});
