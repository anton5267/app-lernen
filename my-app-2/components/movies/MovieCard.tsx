import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Movie } from '@/types/movie';

type MovieCardProps = {
  movie: Movie;
  onEdit: (movie: Movie) => void;
  onDelete: (id: string) => void;
  onToggleWatched: (id: string) => void;
  colors: {
    cardBg: string;
    textMain: string;
    textMuted: string;
    badgeWatchedBg: string;
    badgeWatchedText: string;
    badgePendingBg: string;
    badgePendingText: string;
    editButtonBg: string;
    editButtonText: string;
    dangerButtonBg: string;
    dangerButtonText: string;
  };
};

export function MovieCard({ movie, onEdit, onDelete, onToggleWatched, colors }: MovieCardProps) {
  return (
    <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
      <Image source={{ uri: movie.image }} style={styles.image} resizeMode="cover" />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.textMain }]}>{movie.title}</Text>
          <Pressable
            style={[
              styles.badge,
              { backgroundColor: movie.watched ? colors.badgeWatchedBg : colors.badgePendingBg },
            ]}
            onPress={() => onToggleWatched(movie.id)}>
            <Text
              style={[
                styles.badgeText,
                { color: movie.watched ? colors.badgeWatchedText : colors.badgePendingText },
              ]}>
              {movie.watched ? 'Переглянуто' : 'Заплановано'}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.rating, { color: colors.textMuted }]}>Оцінка: {movie.rating.toFixed(1)}/10</Text>

        <View style={styles.actions}>
          <Pressable style={[styles.actionButton, { backgroundColor: colors.editButtonBg }]} onPress={() => onEdit(movie)}>
            <Text style={[styles.actionText, { color: colors.editButtonText }]}>Редагувати</Text>
          </Pressable>
          <Pressable
            style={[styles.actionButton, { backgroundColor: colors.dangerButtonBg }]}
            onPress={() => onDelete(movie.id)}>
            <Text style={[styles.actionText, { color: colors.dangerButtonText }]}>Видалити</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    width: '100%',
  },
  image: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginBottom: 12,
  },
  content: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 26,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rating: {
    fontSize: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
