import { apiFetch } from './apiClient';

function mockResponse(payload: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(payload),
  } as unknown as Response;
}

describe('apiFetch', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterAll(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns parsed payload for successful response', async () => {
    (globalThis.fetch as unknown as jest.Mock).mockResolvedValueOnce(mockResponse({ ok: true }, 200));

    const result = await apiFetch<{ ok: boolean }>('/api/health');

    expect(result).toEqual({ ok: true });
    expect(globalThis.fetch as unknown as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('returns undefined for 204 response', async () => {
    (globalThis.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: jest.fn(),
    } as unknown as Response);

    const result = await apiFetch<void>('/api/logout', { method: 'POST' });

    expect(result).toBeUndefined();
  });

  it('uses backend error message when present', async () => {
    (globalThis.fetch as unknown as jest.Mock).mockResolvedValueOnce(
      mockResponse({ error: 'Custom backend error' }, 400)
    );

    await expect(apiFetch('/api/favorites')).rejects.toThrow('Custom backend error');
  });

  it('falls back to HTTP status when backend payload is not json', async () => {
    (globalThis.fetch as unknown as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: jest.fn().mockRejectedValue(new Error('invalid json')),
    } as unknown as Response);

    await expect(apiFetch('/api/favorites', { retryAttempts: 0 })).rejects.toThrow('HTTP 503');
  });

  it('returns friendly message for network failures', async () => {
    (globalThis.fetch as unknown as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(apiFetch('/api/favorites', { retryAttempts: 0 })).rejects.toThrow(
      'Не вдалося підключитися до сервера'
    );
  });

  it('rethrows abort errors unchanged', async () => {
    const abortError = new Error('Aborted');
    abortError.name = 'AbortError';
    (globalThis.fetch as unknown as jest.Mock).mockRejectedValueOnce(abortError);

    await expect(apiFetch('/api/favorites')).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('returns timeout message when request exceeds timeout', async () => {
    (globalThis.fetch as unknown as jest.Mock).mockImplementationOnce((_url: string, init?: RequestInit) => {
      return new Promise((_resolve, reject) => {
        const rejectAbort = () => {
          const abortError = new Error('Aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        };

        if (init?.signal?.aborted) {
          rejectAbort();
          return;
        }

        init?.signal?.addEventListener('abort', rejectAbort, { once: true });
      });
    });

    await expect(apiFetch('/api/favorites', { timeoutMs: 1, retryAttempts: 0 })).rejects.toThrow(
      'Час очікування запиту вичерпано'
    );
  });

  it('retries GET requests once on network error and succeeds', async () => {
    (globalThis.fetch as unknown as jest.Mock)
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce(mockResponse({ ok: true }, 200));

    const result = await apiFetch<{ ok: boolean }>('/api/health', { retryDelayMs: 0 });

    expect(result).toEqual({ ok: true });
    expect(globalThis.fetch as unknown as jest.Mock).toHaveBeenCalledTimes(2);
  });

  it('retries GET requests on retryable HTTP status and succeeds', async () => {
    (globalThis.fetch as unknown as jest.Mock)
      .mockResolvedValueOnce(mockResponse({ error: 'Temporary unavailable' }, 503))
      .mockResolvedValueOnce(mockResponse({ ok: true }, 200));

    const result = await apiFetch<{ ok: boolean }>('/api/health', { retryDelayMs: 0 });

    expect(result).toEqual({ ok: true });
    expect(globalThis.fetch as unknown as jest.Mock).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-GET requests by default', async () => {
    (globalThis.fetch as unknown as jest.Mock).mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(
      apiFetch('/api/favorites', {
        method: 'POST',
        body: { title: 'Test' },
      })
    ).rejects.toThrow('Не вдалося підключитися до сервера');

    expect(globalThis.fetch as unknown as jest.Mock).toHaveBeenCalledTimes(1);
  });
});
