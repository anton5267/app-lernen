import { useLocalSearchParams } from 'expo-router';

import { MediaDetailsScreen } from '@/components/movies/MediaDetailsScreen';
import { getTvDetails } from '@/services/movieApi';

export default function TvDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const tvId = Number(params.id);
  return (
    <MediaDetailsScreen
      contentId={tvId}
      mediaType="tv"
      screenFallbackTitle="Деталі серіалу"
      invalidIdMessage="Невірний id серіалу"
      similarSectionTitle="Схожі серіали"
      fetchDetails={getTvDetails}
    />
  );
}
