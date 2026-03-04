import { ViewingHistoryItem } from '@/types/api';

export type HistoryTypeFilter = 'all' | 'movie' | 'tv' | 'video';

export function historyMediaTypeLabel(type: ViewingHistoryItem['mediaType']) {
  if (type === 'movie') {
    return 'Фільм';
  }
  if (type === 'tv') {
    return 'Серіал';
  }
  if (type === 'youtube') {
    return 'YouTube';
  }
  return 'Twitch';
}

function matchesTypeFilter(item: ViewingHistoryItem, typeFilter: HistoryTypeFilter) {
  if (typeFilter === 'all') {
    return true;
  }
  if (typeFilter === 'video') {
    return item.mediaType === 'youtube' || item.mediaType === 'twitch';
  }
  return item.mediaType === typeFilter;
}

export function filterViewingHistory(
  items: ViewingHistoryItem[],
  options: {
    query: string;
    typeFilter: HistoryTypeFilter;
  }
) {
  const normalizedQuery = options.query.trim().toLowerCase();

  return items.filter((item) => {
    if (!matchesTypeFilter(item, options.typeFilter)) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    const haystack = [
      item.title,
      item.channelTitle,
      item.year,
      item.mediaType,
      historyMediaTypeLabel(item.mediaType),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
