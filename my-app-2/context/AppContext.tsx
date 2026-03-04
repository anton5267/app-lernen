import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  changeLocalPassword,
  getCurrentUser,
  loginDemo,
  loginLocalAccount,
  loginWithGoogleIdToken,
  logoutSession,
  registerLocalAccount,
  updateCurrentUserProfile,
  updateUserSettings as updateUserSettingsApi,
} from '@/services/authApi';
import { addFavorite, clearClientReadCache, getFavorites, removeFavorite, updateFavorite } from '@/services/movieApi';
import { useColorScheme } from '@/hooks/useColorScheme';
import { ApiUser, FavoriteMovie, SearchMovie, UserSettings } from '@/types/api';

const STORAGE_KEYS = {
  theme: 'app.themePreference',
} as const;

export type ThemePreference = 'system' | 'light' | 'dark' | 'warm';
type ActionResult = { ok: boolean; message: string };

type AppContextValue = {
  hydrated: boolean;
  themePreference: ThemePreference;
  resolvedTheme: 'light' | 'dark' | 'warm';
  setThemePreference: (value: ThemePreference) => void;
  user: ApiUser | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  signInWithGoogle: (idToken: string) => Promise<ActionResult>;
  signInDemo: (name: string) => Promise<ActionResult>;
  signInLocal: (payload: { email: string; password: string }) => Promise<ActionResult>;
  signUpLocal: (payload: { name: string; email: string; password: string }) => Promise<ActionResult>;
  updateProfile: (payload: { name?: string; email?: string; picture?: string | null }) => Promise<ActionResult>;
  updateSettings: (payload: Partial<UserSettings>) => Promise<ActionResult>;
  changePassword: (payload: { currentPassword: string; newPassword: string }) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  favorites: FavoriteMovie[];
  favoritesLoading: boolean;
  favoritesError: string | null;
  refreshFavorites: () => Promise<void>;
  addFavoriteFromSearch: (movie: SearchMovie) => Promise<{ ok: boolean; message: string }>;
  patchFavorite: (
    favoriteId: string,
    payload: { watched?: boolean; personalRating?: number | null; notes?: string }
  ) => Promise<void>;
  deleteFavoriteById: (favoriteId: string) => Promise<void>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

function isUnauthorizedError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  return message.includes('401') || message.includes('unauthorized');
}

function extractErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function parseThemeFromUser(user: ApiUser | null): ThemePreference | null {
  if (!user?.settings?.theme) {
    return null;
  }
  const theme = user.settings.theme;
  if (theme === 'system' || theme === 'light' || theme === 'dark' || theme === 'warm') {
    return theme;
  }
  return null;
}

function parseThemePreference(value: string | null | undefined): ThemePreference | null {
  if (value === 'system' || value === 'light' || value === 'dark' || value === 'warm') {
    return value;
  }
  return null;
}

export function AppProvider({ children }: PropsWithChildren) {
  const systemTheme = useColorScheme() ?? 'light';

  const [hydrated, setHydrated] = useState(false);
  const [themePreference, setThemePreference] = useState<ThemePreference>('system');

  const [user, setUser] = useState<ApiUser | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const [favorites, setFavorites] = useState<FavoriteMovie[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const sessionRequestIdRef = useRef(0);
  const favoritesRequestIdRef = useRef(0);

  const applyAuthenticatedUser = useCallback((nextUser: ApiUser) => {
    setUser(nextUser);
    setFavoritesError(null);
    const userTheme = parseThemeFromUser(nextUser);
    if (userTheme) {
      setThemePreference(userTheme);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function hydrate() {
      try {
        const storedTheme = await AsyncStorage.getItem(STORAGE_KEYS.theme);
        if (
          storedTheme === 'system' ||
          storedTheme === 'light' ||
          storedTheme === 'dark' ||
          storedTheme === 'warm'
        ) {
          setThemePreference(storedTheme);
        }
      } finally {
        if (active) {
          setHydrated(true);
        }
      }
    }

    hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    AsyncStorage.setItem(STORAGE_KEYS.theme, themePreference).catch(() => {
      // non-fatal
    });
  }, [hydrated, themePreference]);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') {
      return;
    }

    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEYS.theme) {
        return;
      }

      const nextTheme = parseThemePreference(event.newValue);
      if (!nextTheme || nextTheme === themePreference) {
        return;
      }

      setThemePreference(nextTheme);
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [hydrated, themePreference]);

  const refreshSession = useCallback(async () => {
    const requestId = ++sessionRequestIdRef.current;
    setAuthLoading(true);
    try {
      const currentUser = await getCurrentUser();
      if (requestId === sessionRequestIdRef.current) {
        applyAuthenticatedUser(currentUser);
      }
    } catch (error) {
      if (requestId !== sessionRequestIdRef.current) {
        return;
      }
      if (!isUnauthorizedError(error)) {
        // keep quiet in UI, but clear user for safety
      }
      clearClientReadCache();
      setUser(null);
      setFavorites([]);
      setFavoritesError(null);
    } finally {
      if (requestId === sessionRequestIdRef.current) {
        setAuthLoading(false);
      }
    }
  }, [applyAuthenticatedUser]);

  useEffect(() => {
    refreshSession().catch(() => {
      // handled in refreshSession
    });
  }, [refreshSession]);

  const refreshFavorites = useCallback(async () => {
    const requestId = ++favoritesRequestIdRef.current;
    if (!user) {
      setFavorites([]);
      setFavoritesError(null);
      return;
    }

    setFavoritesLoading(true);
    setFavoritesError(null);
    try {
      const items = await getFavorites();
      if (requestId === favoritesRequestIdRef.current) {
        setFavorites(items);
        setFavoritesError(null);
      }
    } catch (error) {
      if (requestId === favoritesRequestIdRef.current) {
        if (isUnauthorizedError(error)) {
          setFavorites([]);
          setFavoritesError('Сесію завершено. Увійдіть знову, щоб переглянути колекцію.');
        } else {
          setFavoritesError(extractErrorMessage(error, 'Не вдалося оновити колекцію.'));
        }
      }
      throw error;
    } finally {
      if (requestId === favoritesRequestIdRef.current) {
        setFavoritesLoading(false);
      }
    }
  }, [user]);

  useEffect(() => {
    refreshFavorites().catch(() => {
      // keep current favorites in UI; error state is handled in refreshFavorites
    });
  }, [refreshFavorites, user?.id]);

  const resolvedTheme = themePreference === 'system' ? systemTheme : themePreference;

  const signInWithGoogle = useCallback(async (idToken: string) => {
    setAuthLoading(true);
    try {
      const currentUser = await loginWithGoogleIdToken(idToken);
      applyAuthenticatedUser(currentUser);
      return { ok: true, message: `Вхід виконано: ${currentUser.name}` };
    } catch (error) {
      const message = extractErrorMessage(error, 'Помилка входу через Google');
      return { ok: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, [applyAuthenticatedUser]);

  const signInDemo = useCallback(async (name: string) => {
    setAuthLoading(true);
    try {
      const currentUser = await loginDemo(name);
      applyAuthenticatedUser(currentUser);
      return { ok: true, message: `Демо-вхід: ${currentUser.name}` };
    } catch (error) {
      const message = extractErrorMessage(error, 'Помилка демо-входу');
      return { ok: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, [applyAuthenticatedUser]);

  const signInLocal = useCallback(async ({ email, password }: { email: string; password: string }) => {
    setAuthLoading(true);
    try {
      const currentUser = await loginLocalAccount({ email, password });
      applyAuthenticatedUser(currentUser);
      return { ok: true, message: `Вхід виконано: ${currentUser.name}` };
    } catch (error) {
      const message = extractErrorMessage(error, 'Помилка входу');
      return { ok: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, [applyAuthenticatedUser]);

  const signUpLocal = useCallback(async ({ name, email, password }: { name: string; email: string; password: string }) => {
    setAuthLoading(true);
    try {
      const currentUser = await registerLocalAccount({ name, email, password });
      applyAuthenticatedUser(currentUser);
      return { ok: true, message: `Акаунт створено: ${currentUser.name}` };
    } catch (error) {
      const message = extractErrorMessage(error, 'Помилка реєстрації');
      return { ok: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, [applyAuthenticatedUser]);

  const updateProfile = useCallback(async ({ name, email, picture }: { name?: string; email?: string; picture?: string | null }) => {
    setAuthLoading(true);
    try {
      const currentUser = await updateCurrentUserProfile({ name, email, picture });
      applyAuthenticatedUser(currentUser);
      return { ok: true, message: 'Профіль оновлено.' };
    } catch (error) {
      const message = extractErrorMessage(error, 'Не вдалося оновити профіль');
      return { ok: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, [applyAuthenticatedUser]);

  const updateSettings = useCallback(async (payload: Partial<UserSettings>) => {
    setAuthLoading(true);
    try {
      const response = await updateUserSettingsApi(payload);
      applyAuthenticatedUser(response.user);
      return { ok: true, message: 'Налаштування збережено.' };
    } catch (error) {
      const message = extractErrorMessage(error, 'Не вдалося зберегти налаштування');
      return { ok: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, [applyAuthenticatedUser]);

  const changePassword = useCallback(async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
    setAuthLoading(true);
    try {
      await changeLocalPassword({ currentPassword, newPassword });
      return { ok: true, message: 'Пароль змінено.' };
    } catch (error) {
      const message = extractErrorMessage(error, 'Не вдалося змінити пароль');
      return { ok: false, message };
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutSession();
    } finally {
      sessionRequestIdRef.current += 1;
      favoritesRequestIdRef.current += 1;
      clearClientReadCache();
      setUser(null);
      setFavorites([]);
      setFavoritesError(null);
      setAuthLoading(false);
      setFavoritesLoading(false);
    }
  }, []);

  const addFavoriteFromSearch = useCallback(async (movie: SearchMovie) => {
    try {
      const item = await addFavorite(movie);
      setFavorites((prev) => {
        const exists = prev.some((fav) => fav.id === item.id);
        return exists ? prev : [item, ...prev];
      });
      setFavoritesError(null);
      return { ok: true, message: `Додано в колекцію: ${movie.title}` };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося додати фільм';
      return { ok: false, message };
    }
  }, []);

  const patchFavorite = useCallback(async (
    favoriteId: string,
    payload: { watched?: boolean; personalRating?: number | null; notes?: string }
  ) => {
    const item = await updateFavorite(favoriteId, payload);
    setFavorites((prev) => prev.map((favorite) => (favorite.id === item.id ? item : favorite)));
    setFavoritesError(null);
  }, []);

  const deleteFavoriteById = useCallback(async (favoriteId: string) => {
    await removeFavorite(favoriteId);
    setFavorites((prev) => prev.filter((item) => item.id !== favoriteId));
    setFavoritesError(null);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      hydrated,
      themePreference,
      resolvedTheme,
      setThemePreference,
      user,
      isAuthenticated: Boolean(user),
      authLoading,
      signInWithGoogle,
      signInDemo,
      signInLocal,
      signUpLocal,
      updateProfile,
      updateSettings,
      changePassword,
      signOut,
      refreshSession,
      favorites,
      favoritesLoading,
      favoritesError,
      refreshFavorites,
      addFavoriteFromSearch,
      patchFavorite,
      deleteFavoriteById,
    }),
    [
      addFavoriteFromSearch,
      authLoading,
      changePassword,
      deleteFavoriteById,
      favorites,
      favoritesError,
      favoritesLoading,
      hydrated,
      patchFavorite,
      refreshFavorites,
      refreshSession,
      resolvedTheme,
      signInDemo,
      signInLocal,
      signInWithGoogle,
      signOut,
      signUpLocal,
      themePreference,
      updateProfile,
      updateSettings,
      user,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
