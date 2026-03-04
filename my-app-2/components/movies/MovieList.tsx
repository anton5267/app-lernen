import { StyleSheet, Text, View } from 'react-native';

import { Movie } from '@/types/movie';

import { MovieCard } from './MovieCard';

type MovieListProps = {
  movies: Movie[];
  onEdit: (movie: Movie) => void;
  onDelete: (id: string) => void;
  onToggleWatched: (id: string) => void;
  emptyTextColor: string;
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

export function MovieList({
  movies,
  onEdit,
  onDelete,
  onToggleWatched,
  emptyTextColor,
  colors,
}: MovieListProps) {
  if (movies.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={[styles.emptyText, { color: emptyTextColor }]}>Нічого не знайдено за поточним фільтром.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {movies.map((movie) => (
        <MovieCard
          key={movie.id}
          movie={movie}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleWatched={onToggleWatched}
          colors={colors}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  emptyState: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
