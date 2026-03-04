import { useLocalSearchParams } from 'expo-router';

import { MediaDetailsScreen } from '@/components/movies/MediaDetailsScreen';
import { getMovieDetails } from '@/services/movieApi';

export default function MovieDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const movieId = Number(params.id);

  return (
    <MediaDetailsScreen
      contentId={movieId}
      mediaType="movie"
      screenFallbackTitle="Деталі фільму"
      invalidIdMessage="Невірний id фільму"
      similarSectionTitle="Схожі фільми"
      fetchDetails={getMovieDetails}
    />
  );
}
