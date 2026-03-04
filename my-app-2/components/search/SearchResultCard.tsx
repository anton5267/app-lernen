import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { memo, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SearchMovie } from '@/types/api';

export type SearchResultCardPalette = {
  cardBg: string;
  border: string;
  textMain: string;
  textMuted: string;
  primaryBtn: string;
  info: string;
  success: string;
  live: string;
};

type SearchResultCardProps = {
  item: SearchMovie;
  layoutMode: 'single' | 'double' | 'triple';
  compact?: boolean;
  isInCollection: boolean;
  isAddPending: boolean;
  isAuthenticated: boolean;
  palette: SearchResultCardPalette;
  onOpen: (item: SearchMovie) => void;
  onAddToFavorites: (item: SearchMovie) => void;
  onOpenCollection: () => void;
};

function mediaTypeLabel(type: SearchMovie['mediaType']) {
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

function SearchResultCardComponent({
  item,
  layoutMode,
  compact = false,
  isInCollection,
  isAddPending,
  isAuthenticated,
  palette,
  onOpen,
  onAddToFavorites,
  onOpenCollection,
}: SearchResultCardProps) {
  const [posterLoadFailed, setPosterLoadFailed] = useState(false);
  const isCatalog = item.mediaType === 'movie' || item.mediaType === 'tv';
  const isExternal = item.mediaType === 'youtube' || item.mediaType === 'twitch';
  const canOpenCollection = isCatalog && isAuthenticated && isInCollection;
  const ratingLabel = item.rating !== null && item.rating !== undefined ? `${item.rating.toFixed(1)}/10` : '—';
  const hasPoster = Boolean(item.poster) && !posterLoadFailed;
  const hasRating = item.rating !== null && item.rating !== undefined;

  useEffect(() => {
    setPosterLoadFailed(false);
  }, [item.id, item.poster]);

  return (
    <View
      style={[
        styles.movieCard,
        layoutMode === 'double' && styles.movieCardDouble,
        layoutMode === 'triple' && styles.movieCardTriple,
        isExternal && styles.externalCard,
        { backgroundColor: palette.cardBg, borderColor: palette.border },
      ]}>
      <View style={styles.posterWrap}>
        {hasPoster ? (
          <ExpoImage
            source={{ uri: item.poster! }}
            style={[
              styles.poster,
              isExternal && styles.posterExternal,
              isExternal && layoutMode === 'single' && styles.posterExternalSingle,
            ]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={140}
            onError={() => setPosterLoadFailed(true)}
          />
        ) : (
          <View
            style={[
              styles.posterFallback,
              isExternal && styles.posterExternal,
              isExternal && layoutMode === 'single' && styles.posterExternalSingle,
              { borderColor: palette.border },
            ]}>
            <Text style={{ color: palette.textMuted }}>Постер недоступний</Text>
          </View>
        )}
        {hasRating ? (
          <View style={[styles.ratingBadge, { backgroundColor: '#050912cc', borderColor: palette.border }]}>
            <Ionicons name="star" size={11} color="#facc15" />
            <Text style={styles.ratingBadgeText}>{ratingLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.movieInfo}>
        <View style={styles.badgeRow}>
          <Text style={[styles.mediaBadge, { backgroundColor: palette.primaryBtn }]}>
            {mediaTypeLabel(item.mediaType)}
          </Text>
          {item.isLive ? <Text style={[styles.mediaBadge, { backgroundColor: palette.live }]}>НАЖИВО</Text> : null}
        </View>
        <Text style={[styles.movieTitle, { color: palette.textMain }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.movieMeta, { color: palette.textMuted }]}>
          {item.year ?? '—'}
          {hasRating ? ` | ${ratingLabel}` : ''}
          {item.channelTitle ? ` | ${item.channelTitle}` : ''}
        </Text>
      </View>

      <View style={[styles.movieActions, compact && styles.movieActionsCompact]}>
        <Pressable
          style={(state) => [
            styles.smallButton,
            compact && styles.smallButtonCompact,
            state.pressed && styles.smallButtonPressed,
            Boolean((state as { hovered?: boolean }).hovered) && styles.smallButtonHover,
            { backgroundColor: palette.primaryBtn },
          ]}
          onPress={() => onOpen(item)}>
          <Ionicons
            name={isCatalog ? 'information-circle-outline' : 'open-outline'}
            size={14}
            color="#fff"
          />
          <Text style={styles.smallButtonText} numberOfLines={1}>
            {isCatalog ? 'Деталі' : 'Відкрити'}
          </Text>
        </Pressable>

        {isCatalog ? (
          <Pressable
          style={(state) => [
            styles.smallButton,
            compact && styles.smallButtonCompact,
            isAddPending && styles.smallButtonDisabled,
            state.pressed && !isAddPending && styles.smallButtonPressed,
            Boolean((state as { hovered?: boolean }).hovered) && !isAddPending && styles.smallButtonHover,
            {
              backgroundColor: canOpenCollection ? palette.success : palette.info,
              },
            ]}
            disabled={isAddPending}
            onPress={() => {
              if (canOpenCollection) {
                onOpenCollection();
                return;
              }
              onAddToFavorites(item);
            }}>
            <Ionicons
              name={isAddPending ? 'hourglass-outline' : canOpenCollection ? 'bookmark-outline' : 'heart-outline'}
              size={14}
              color="#fff"
            />
            <Text style={styles.smallButtonText} numberOfLines={1}>
              {isAddPending ? 'Додаю...' : canOpenCollection ? 'В колекцію' : 'В улюблені'}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const SearchResultCard = memo(SearchResultCardComponent);

const styles = StyleSheet.create({
  movieCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 10,
    overflow: 'hidden',
  },
  externalCard: {
    gap: 8,
    padding: 10,
  },
  movieCardDouble: {
    width: '49.2%',
  },
  movieCardTriple: {
    width: '32.4%',
  },
  posterWrap: {
    position: 'relative',
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
  },
  posterExternal: {
    aspectRatio: 21 / 9,
    maxHeight: 180,
  },
  posterExternalSingle: {
    maxHeight: 164,
  },
  posterFallback: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  movieInfo: {
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  mediaBadge: {
    color: '#ffffff',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  movieTitle: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  movieMeta: {
    fontSize: 13,
  },
  movieActions: {
    flexDirection: 'row',
    gap: 8,
  },
  movieActionsCompact: {
    flexDirection: 'column',
  },
  smallButton: {
    flex: 1,
    minWidth: 0,
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  smallButtonCompact: {
    width: '100%',
  },
  smallButtonDisabled: {
    opacity: 0.65,
  },
  smallButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  smallButtonHover: {
    transform: [{ translateY: -1 }],
  },
  smallButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
    flexShrink: 1,
  },
});
