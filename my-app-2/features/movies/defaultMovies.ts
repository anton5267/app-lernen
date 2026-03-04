import { Movie } from '@/types/movie';

export const DEFAULT_MOVIES: Movie[] = [
  {
    id: 'inception',
    title: 'Початок',
    rating: 9,
    image: 'https://www.w3schools.com/w3images/lights.jpg',
    watched: true,
  },
  {
    id: 'dark-knight',
    title: 'Темний лицар',
    rating: 9.5,
    image: 'https://www.w3schools.com/w3images/forest.jpg',
    watched: true,
  },
  {
    id: 'interstellar',
    title: 'Міжзоряний',
    rating: 8.5,
    image: 'https://www.w3schools.com/w3images/mountains.jpg',
    watched: false,
  },
];
