import {
  MAX_IMPORT_JSON_BYTES,
  formatBytes,
  parseFavoritesImportPayload,
} from './import';

describe('collection import utils', () => {
  it('formats bytes with readable units', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(120)).toBe('120 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(2_621_440)).toBe('2.50 MB');
  });

  it('parses array payload', () => {
    const payload = JSON.stringify([{ id: 1 }, { id: 2 }]);
    const result = parseFavoritesImportPayload(payload);
    expect(result.error).toBeNull();
    expect(result.items).toHaveLength(2);
  });

  it('parses object payload with items', () => {
    const payload = JSON.stringify({ version: 2, items: [{ id: 1 }] });
    const result = parseFavoritesImportPayload(payload);
    expect(result.error).toBeNull();
    expect(result.items).toHaveLength(1);
  });

  it('returns user-friendly error on invalid json', () => {
    const result = parseFavoritesImportPayload('{"broken":}');
    expect(result.items).toBeNull();
    expect(result.error).toContain('Невалідний JSON');
  });

  it('returns error when items are missing', () => {
    const result = parseFavoritesImportPayload(JSON.stringify({ version: 2 }));
    expect(result.items).toBeNull();
    expect(result.error).toBe('JSON не містить масиву items або він порожній.');
  });

  it('rejects payload bigger than configured limit', () => {
    const oversized = 'x'.repeat(MAX_IMPORT_JSON_BYTES + 1);
    const result = parseFavoritesImportPayload(oversized);
    expect(result.items).toBeNull();
    expect(result.error).toContain('Файл JSON завеликий');
  });
});
