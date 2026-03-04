export const MAX_IMPORT_JSON_BYTES = 2_500_000;

export type ParseFavoritesImportResult = {
  items: unknown[] | null;
  error: string | null;
};

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${Math.round(bytes)} B`;
}

export function parseFavoritesImportPayload(raw: string, maxBytes = MAX_IMPORT_JSON_BYTES): ParseFavoritesImportResult {
  if (raw.length > maxBytes) {
    return {
      items: null,
      error: `Файл JSON завеликий. Максимальний розмір для імпорту: ${formatBytes(maxBytes)}.`,
    };
  }

  let parsed: { items?: unknown[] } | unknown[];
  try {
    parsed = JSON.parse(raw) as { items?: unknown[] } | unknown[];
  } catch (error) {
    const details = error instanceof Error ? error.message : 'невалідний формат';
    return {
      items: null,
      error: `Невалідний JSON: ${details}`,
    };
  }

  const items = Array.isArray(parsed) ? parsed : Array.isArray(parsed.items) ? parsed.items : null;
  if (!items || items.length === 0) {
    return {
      items: null,
      error: 'JSON не містить масиву items або він порожній.',
    };
  }

  return {
    items,
    error: null,
  };
}
