import { useSyncExternalStore } from 'react';
import { ColorSchemeName, useColorScheme as useRNColorScheme } from 'react-native';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
const COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)';

function canUseMatchMedia() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function getBrowserPreferredScheme(): NonNullable<ColorSchemeName> {
  if (!canUseMatchMedia()) {
    return 'light';
  }
  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? 'dark' : 'light';
}

function subscribeToColorScheme(onStoreChange: () => void) {
  if (!canUseMatchMedia()) {
    return () => {};
  }

  const mediaQuery = window.matchMedia(COLOR_SCHEME_QUERY);
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', onStoreChange);
    return () => mediaQuery.removeEventListener('change', onStoreChange);
  }
  if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(onStoreChange);
    return () => mediaQuery.removeListener(onStoreChange);
  }
  return () => {};
}

function getBrowserSchemeSnapshot(): NonNullable<ColorSchemeName> {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia(COLOR_SCHEME_QUERY).matches ? 'dark' : 'light';
}

export function useColorScheme() {
  const browserScheme = useSyncExternalStore(
    subscribeToColorScheme,
    getBrowserSchemeSnapshot,
    getBrowserPreferredScheme
  );
  const colorScheme = useRNColorScheme();

  return colorScheme ?? browserScheme;
}
