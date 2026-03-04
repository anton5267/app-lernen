import { filterViewingHistory, historyMediaTypeLabel } from '@/features/history/utils';
import { ViewingHistoryItem } from '@/types/api';

const baseItems: ViewingHistoryItem[] = [
  {
    id: '1',
    userId: 'u1',
    mediaType: 'movie',
    contentId: '27205',
    title: 'Початок',
    poster: null,
    rating: 8.8,
    year: '2010',
    externalUrl: null,
    channelTitle: null,
    viewedAt: '2026-03-03T12:00:00.000Z',
  },
  {
    id: '2',
    userId: 'u1',
    mediaType: 'tv',
    contentId: '1399',
    title: 'Гра престолів',
    poster: null,
    rating: 9.2,
    year: '2011',
    externalUrl: null,
    channelTitle: null,
    viewedAt: '2026-03-03T11:00:00.000Z',
  },
  {
    id: '3',
    userId: 'u1',
    mediaType: 'youtube',
    contentId: 'yt123',
    title: 'Inception Trailer',
    poster: null,
    rating: null,
    year: null,
    externalUrl: 'https://youtube.com/watch?v=yt123',
    channelTitle: 'Movieclips',
    viewedAt: '2026-03-03T10:00:00.000Z',
  },
  {
    id: '4',
    userId: 'u1',
    mediaType: 'twitch',
    contentId: 'tw123',
    title: 'Movie Discussion Live',
    poster: null,
    rating: null,
    year: null,
    externalUrl: 'https://twitch.tv/example',
    channelTitle: 'cinema_stream',
    viewedAt: '2026-03-03T09:00:00.000Z',
  },
];

describe('history utils', () => {
  it('maps media type labels', () => {
    expect(historyMediaTypeLabel('movie')).toBe('Фільм');
    expect(historyMediaTypeLabel('tv')).toBe('Серіал');
    expect(historyMediaTypeLabel('youtube')).toBe('YouTube');
    expect(historyMediaTypeLabel('twitch')).toBe('Twitch');
  });

  it('filters by type group', () => {
    expect(filterViewingHistory(baseItems, { query: '', typeFilter: 'all' })).toHaveLength(4);
    expect(filterViewingHistory(baseItems, { query: '', typeFilter: 'movie' })).toHaveLength(1);
    expect(filterViewingHistory(baseItems, { query: '', typeFilter: 'tv' })).toHaveLength(1);
    expect(filterViewingHistory(baseItems, { query: '', typeFilter: 'video' })).toHaveLength(2);
  });

  it('filters by normalized query', () => {
    expect(filterViewingHistory(baseItems, { query: 'престол', typeFilter: 'all' })).toEqual([
      expect.objectContaining({ id: '2' }),
    ]);

    expect(filterViewingHistory(baseItems, { query: 'movieclips', typeFilter: 'all' })).toEqual([
      expect.objectContaining({ id: '3' }),
    ]);

    expect(filterViewingHistory(baseItems, { query: '2010', typeFilter: 'all' })).toEqual([
      expect.objectContaining({ id: '1' }),
    ]);
  });

  it('combines type and query filters', () => {
    expect(filterViewingHistory(baseItems, { query: 'movie', typeFilter: 'video' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: '3' }),
        expect.objectContaining({ id: '4' }),
      ])
    );

    expect(filterViewingHistory(baseItems, { query: 'movieclips', typeFilter: 'movie' })).toHaveLength(0);
  });
});
