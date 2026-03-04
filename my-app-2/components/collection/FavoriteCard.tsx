import { Ionicons } from '@expo/vector-icons';
import { Image as ExpoImage } from 'expo-image';
import { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { FavoriteMovie } from '@/types/api';

export type FavoriteCardPalette = {
  cardBg: string;
  panelBg: string;
  border: string;
  textMain: string;
  textMuted: string;
  primary: string;
  success: string;
  info: string;
  danger: string;
};

type FavoriteCardProps = {
  item: FavoriteMovie;
  personalRatingDraft: string;
  notesDraft: string;
  compact?: boolean;
  wide: boolean;
  tablet: boolean;
  statusUpdating: boolean;
  palette: FavoriteCardPalette;
  onPersonalRatingChange: (favoriteId: string, value: string) => void;
  onNotesChange: (favoriteId: string, value: string) => void;
  onOpenDetails: (item: FavoriteMovie) => void;
  onToggleWatched: (item: FavoriteMovie) => void;
  onRemove: (item: FavoriteMovie) => void;
  onSave: (item: FavoriteMovie) => void;
};

function FavoriteCardComponent({
  item,
  personalRatingDraft,
  notesDraft,
  compact = false,
  wide,
  tablet,
  statusUpdating,
  palette,
  onPersonalRatingChange,
  onNotesChange,
  onOpenDetails,
  onToggleWatched,
  onRemove,
  onSave,
}: FavoriteCardProps) {
  const [posterLoadFailed, setPosterLoadFailed] = useState(false);
  const metaLabel = item.mediaType === 'tv' ? 'Серіал' : 'Фільм';
  const statusLabel = item.watched ? 'Переглянуто' : 'Заплановано';
  const statusIcon: keyof typeof Ionicons.glyphMap = item.watched ? 'checkmark-done-outline' : 'time-outline';
  const hasPoster = Boolean(item.poster) && !posterLoadFailed;

  const createdLabel = useMemo(() => {
    const parsed = new Date(item.createdAt);
    if (Number.isNaN(parsed.getTime())) {
      return 'дата невідома';
    }
    return parsed.toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }, [item.createdAt]);

  useEffect(() => {
    setPosterLoadFailed(false);
  }, [item.id, item.poster]);

  return (
    <View
      style={[
        styles.card,
        wide && styles.cardWide,
        { backgroundColor: palette.cardBg, borderColor: palette.border },
      ]}>
      {hasPoster ? (
        <ExpoImage
          source={{ uri: item.poster! }}
          style={[styles.poster, tablet && styles.posterTablet]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={140}
          onError={() => setPosterLoadFailed(true)}
        />
      ) : (
        <View style={[styles.posterFallback, tablet && styles.posterTablet, { backgroundColor: palette.panelBg, borderColor: palette.border }]}>
          <Ionicons name="image-outline" size={18} color={palette.textMuted} />
          <Text style={[styles.posterFallbackText, { color: palette.textMuted }]}>Постер недоступний</Text>
        </View>
      )}

      <View style={styles.badgeRow}>
        <Text style={[styles.mediaBadge, { backgroundColor: palette.primary }]}>{metaLabel}</Text>
        <Text style={[styles.mediaBadge, { backgroundColor: item.watched ? palette.success : palette.info }]}>
          {statusLabel}
        </Text>
      </View>
      <Text style={[styles.movieTitle, { color: palette.textMain }]} numberOfLines={2}>
        {item.title}
      </Text>
      <Text style={[styles.movieMeta, { color: palette.textMuted }]}>
        {item.year ?? '—'} • TMDB: {item.rating ?? '—'} • Мій: {item.personalRating ?? '—'}
      </Text>
      <Text style={[styles.movieMeta, { color: palette.textMuted }]}>Додано: {createdLabel}</Text>

      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <Pressable
          style={(state) => [
            styles.cardButton,
            compact && styles.cardButtonCompact,
            state.pressed && styles.cardButtonPressed,
            Boolean((state as { hovered?: boolean }).hovered) && styles.cardButtonHover,
            { backgroundColor: palette.primary },
          ]}
          onPress={() => onOpenDetails(item)}>
          <Ionicons name="open-outline" size={15} color="#ffffff" />
          <Text style={styles.cardButtonText} numberOfLines={1}>Деталі</Text>
        </Pressable>
        <Pressable
          style={(state) => [
            styles.cardButton,
            compact && styles.cardButtonCompact,
            statusUpdating && styles.cardButtonDisabled,
            state.pressed && !statusUpdating && styles.cardButtonPressed,
            Boolean((state as { hovered?: boolean }).hovered) && !statusUpdating && styles.cardButtonHover,
            { backgroundColor: item.watched ? palette.success : palette.info },
          ]}
          disabled={statusUpdating}
          onPress={() => onToggleWatched(item)}>
          <Ionicons name={statusUpdating ? 'hourglass-outline' : statusIcon} size={15} color="#ffffff" />
          <Text style={styles.cardButtonText} numberOfLines={1}>{statusUpdating ? 'Оновлення...' : statusLabel}</Text>
        </Pressable>
        <Pressable
          style={(state) => [
            styles.cardButton,
            compact && styles.cardButtonCompact,
            state.pressed && styles.cardButtonPressed,
            Boolean((state as { hovered?: boolean }).hovered) && styles.cardButtonHover,
            { backgroundColor: palette.danger },
          ]}
          onPress={() => onRemove(item)}>
          <Ionicons name="trash-outline" size={15} color="#ffffff" />
          <Text style={styles.cardButtonText} numberOfLines={1}>Видалити</Text>
        </Pressable>
      </View>

      <TextInput
        style={[
          styles.input,
          { backgroundColor: palette.panelBg, borderColor: palette.border, color: palette.textMain },
        ]}
        value={personalRatingDraft}
        onChangeText={(value) => onPersonalRatingChange(item.id, value)}
        placeholder="Моя оцінка (0-10)"
        placeholderTextColor={palette.textMuted}
        keyboardType="decimal-pad"
      />
      <TextInput
        style={[
          styles.input,
          styles.notesInput,
          { backgroundColor: palette.panelBg, borderColor: palette.border, color: palette.textMain },
        ]}
        value={notesDraft}
        onChangeText={(value) => onNotesChange(item.id, value)}
        placeholder="Нотатки"
        placeholderTextColor={palette.textMuted}
        multiline
      />
      <Pressable
        style={(state) => [
          styles.cardButton,
          styles.saveButton,
          compact && styles.cardButtonCompact,
          state.pressed && styles.cardButtonPressed,
          Boolean((state as { hovered?: boolean }).hovered) && styles.cardButtonHover,
          { backgroundColor: palette.primary },
        ]}
        onPress={() => onSave(item)}>
        <Ionicons name="save-outline" size={15} color="#ffffff" />
        <Text style={styles.cardButtonText} numberOfLines={1}>Зберегти зміни</Text>
      </Pressable>
    </View>
  );
}

export const FavoriteCard = memo(FavoriteCardComponent);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  cardWide: {
    width: '49%',
  },
  poster: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  posterFallback: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  posterFallbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
  posterTablet: {
    height: 250,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  mediaBadge: {
    color: '#ffffff',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  movieTitle: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  movieMeta: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionsCompact: {
    flexDirection: 'column',
  },
  cardButton: {
    borderRadius: 9,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 0,
  },
  cardButtonCompact: {
    width: '100%',
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  cardButtonDisabled: {
    opacity: 0.7,
  },
  cardButtonPressed: {
    transform: [{ scale: 0.99 }],
  },
  cardButtonHover: {
    transform: [{ translateY: -1 }],
  },
  saveButton: {
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  cardButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    flexShrink: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  notesInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
