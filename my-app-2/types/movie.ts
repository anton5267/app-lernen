export type Movie = {
  id: string;
  title: string;
  rating: number;
  image: string;
  watched: boolean;
};

export type MovieDraft = {
  title: string;
  rating: string;
  image: string;
};

export type MovieSort = 'rating-desc' | 'rating-asc' | 'title-asc' | 'title-desc';
