const {
  mapHistoryItem,
  normalizeHistoryPayload,
  parseHistoryLimit,
  parseHistoryMediaType,
  pruneHistoryForUser,
} = require('../src/history');

describe('history helpers', () => {
  it('parses allowed media types', () => {
    expect(parseHistoryMediaType('movie')).toBe('movie');
    expect(parseHistoryMediaType('TV')).toBe('tv');
    expect(parseHistoryMediaType('youtube')).toBe('youtube');
    expect(parseHistoryMediaType('twitch')).toBe('twitch');
    expect(parseHistoryMediaType('unknown')).toBeNull();
  });

  it('normalizes and validates history payload', () => {
    expect(normalizeHistoryPayload({ mediaType: 'movie', contentId: '', title: 'A' })).toBeNull();

    const payload = normalizeHistoryPayload({
      mediaType: 'youtube',
      contentId: ' abc123 ',
      title: ' Trailer ',
      year: '2026-03',
      rating: '11',
      externalUrl: 'https://youtube.com/watch?v=abc123',
      channelTitle: ' Movieclips ',
    });

    expect(payload).toEqual({
      mediaType: 'youtube',
      contentId: 'abc123',
      title: 'Trailer',
      poster: null,
      rating: 10,
      year: '2026',
      externalUrl: 'https://youtube.com/watch?v=abc123',
      channelTitle: 'Movieclips',
    });
  });

  it('maps history limit boundaries', () => {
    expect(parseHistoryLimit(undefined)).toBe(50);
    expect(parseHistoryLimit('abc')).toBe(50);
    expect(parseHistoryLimit(0)).toBe(1);
    expect(parseHistoryLimit(999)).toBe(200);
    expect(parseHistoryLimit(12.9)).toBe(12);
  });

  it('maps history item with safe defaults', () => {
    const mapped = mapHistoryItem({
      id: 'h1',
      userId: 'u1',
      mediaType: 'bad',
      contentId: 123,
      title: 'Item',
      viewedAt: '2026-03-03T00:00:00.000Z',
    });

    expect(mapped).toMatchObject({
      id: 'h1',
      userId: 'u1',
      mediaType: 'movie',
      contentId: '123',
      title: 'Item',
    });
  });

  it('prunes user history overflow without touching other users', () => {
    const entries = [
      {
        id: 'a1',
        userId: 'u1',
        viewedAt: '2026-03-03T12:00:00.000Z',
      },
      {
        id: 'a2',
        userId: 'u1',
        viewedAt: '2026-03-03T11:00:00.000Z',
      },
      {
        id: 'a3',
        userId: 'u1',
        viewedAt: '2026-03-03T10:00:00.000Z',
      },
      {
        id: 'b1',
        userId: 'u2',
        viewedAt: '2026-03-03T09:00:00.000Z',
      },
    ];

    const pruned = pruneHistoryForUser(entries, 'u1', 2);
    expect(pruned.map((item) => item.id)).toEqual(['a1', 'a2', 'b1']);
  });
});
