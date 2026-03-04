const webDefaultBaseUrl =
  typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost:4000';
const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
const configuredBaseUrlForCheck = configuredBaseUrl ?? '';
const shouldUseWebOriginOnPublicHost =
  typeof window !== 'undefined' &&
  Boolean(configuredBaseUrl) &&
  /^https?:\/\/localhost(?::\d+)?$/i.test(configuredBaseUrlForCheck) &&
  window.location?.hostname !== 'localhost' &&
  window.location?.hostname !== '127.0.0.1';

export const API_BASE_URL = shouldUseWebOriginOnPublicHost
  ? webDefaultBaseUrl
  : configuredBaseUrl || webDefaultBaseUrl;

const DEFAULT_API_TIMEOUT_MS = 15_000;
const DEFAULT_GET_RETRY_ATTEMPTS = 1;
const DEFAULT_RETRY_DELAY_MS = 250;
const RETRYABLE_HTTP_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const NETWORK_ERROR_MESSAGE = 'Не вдалося підключитися до сервера';
const TIMEOUT_ERROR_MESSAGE = 'Час очікування запиту вичерпано';

type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retryAttempts?: number;
  retryDelayMs?: number;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const timeoutMs = options.timeoutMs ?? DEFAULT_API_TIMEOUT_MS;
  const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);
  const maxRetryAttempts = Math.max(
    0,
    options.retryAttempts ?? (method === 'GET' ? DEFAULT_GET_RETRY_ATTEMPTS : 0)
  );
  const hasBody = options.body !== undefined;
  const bodyIsFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const bodyIsString = typeof options.body === 'string';

  const requestHeaders: Record<string, string> = {
    'ngrok-skip-browser-warning': 'true',
    ...(options.headers ?? {}),
  };

  const hasContentTypeHeader = Object.keys(requestHeaders).some(
    (key) => key.toLowerCase() === 'content-type'
  );
  if (hasBody && !bodyIsFormData && !hasContentTypeHeader) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  let requestBody: BodyInit | undefined;
  if (hasBody) {
    if (bodyIsFormData) {
      requestBody = options.body as FormData;
    } else if (bodyIsString) {
      requestBody = options.body as string;
    } else {
      requestBody = JSON.stringify(options.body);
    }
  }

  const waitForRetry = async (attempt: number) => {
    if (retryDelayMs <= 0) {
      return;
    }
    const delay = retryDelayMs * (attempt + 1);
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (options.signal && onAbort) {
          options.signal.removeEventListener('abort', onAbort);
        }
        resolve();
      }, delay);

      let onAbort: (() => void) | null = null;
      if (options.signal) {
        onAbort = () => {
          clearTimeout(timeoutId);
          options.signal?.removeEventListener('abort', onAbort as () => void);
          const abortError = new Error('Aborted');
          abortError.name = 'AbortError';
          reject(abortError);
        };
        options.signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  };

  const executeAttempt = async () => {
    let timeoutController: AbortController | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let externalAbortListener: (() => void) | null = null;
    let timedOut = false;
    let requestSignal = options.signal;

    if (typeof AbortController !== 'undefined' && timeoutMs > 0) {
      timeoutController = new AbortController();
      requestSignal = timeoutController.signal;

      timeoutId = setTimeout(() => {
        timedOut = true;
        timeoutController?.abort();
      }, timeoutMs);

      if (options.signal) {
        if (options.signal.aborted) {
          timeoutController.abort();
        } else {
          externalAbortListener = () => timeoutController?.abort();
          options.signal.addEventListener('abort', externalAbortListener, { once: true });
        }
      }
    }

    try {
      return await fetch(`${API_BASE_URL}${path}`, {
        method,
        credentials: 'include',
        headers: requestHeaders,
        body: requestBody,
        signal: requestSignal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (timedOut && !options.signal?.aborted) {
          throw new Error(TIMEOUT_ERROR_MESSAGE);
        }
        throw error;
      }
      throw new Error(NETWORK_ERROR_MESSAGE);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (externalAbortListener && options.signal) {
        options.signal.removeEventListener('abort', externalAbortListener);
      }
    }
  };

  for (let attempt = 0; attempt <= maxRetryAttempts; attempt += 1) {
    const canRetry = attempt < maxRetryAttempts;
    let response: Response;
    try {
      response = await executeAttempt();
    } catch (error) {
      const shouldRetryError =
        error instanceof Error &&
        error.name !== 'AbortError' &&
        (error.message === NETWORK_ERROR_MESSAGE || error.message === TIMEOUT_ERROR_MESSAGE);
      if (canRetry && shouldRetryError) {
        await waitForRetry(attempt);
        continue;
      }
      throw error;
    }

    if (!response.ok) {
      const shouldRetryStatus = canRetry && method === 'GET' && RETRYABLE_HTTP_STATUSES.has(response.status);
      if (shouldRetryStatus) {
        await waitForRetry(attempt);
        continue;
      }

      let message = `HTTP ${response.status}`;
      try {
        const payload = (await response.json()) as { error?: string };
        message = payload.error || message;
      } catch {
        // keep fallback message
      }
      throw new Error(message);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  throw new Error(NETWORK_ERROR_MESSAGE);
}
