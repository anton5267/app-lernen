import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { AuthRequiredGate } from '@/components/common/AuthRequiredGate';
import { ScrollTopFab } from '@/components/common/ScrollTopFab';
import { ScreenPanel } from '@/components/common/ScreenPanel';
import { StatusBanner, StatusBannerState } from '@/components/common/StatusBanner';
import { FavoriteCard } from '@/components/collection/FavoriteCard';
import { FavoriteCardSkeleton } from '@/components/collection/FavoriteCardSkeleton';
import { ShareLinkCard } from '@/components/collection/ShareLinkCard';
import { useAppContext } from '@/context/AppContext';
import { MAX_IMPORT_JSON_BYTES, formatBytes, parseFavoritesImportPayload } from '@/features/collection/import';
import { parsePersonalRatingInput } from '@/features/collection/rating';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useScrollTop } from '@/hooks/useScrollTop';
import {
  createCollectionShareLink,
  deleteCollectionShareLink,
  exportFavoritesCollection,
  importFavoritesCollection,
  listCollectionShareLinks,
  uploadVideoFile,
} from '@/services/movieApi';
import { getThemeTokens } from '@/theme/tokens';
import { CollectionShareLink, FavoriteMovie } from '@/types/api';

type SortMode = 'recent' | 'rating-desc' | 'title-asc';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
};

function confirmDestructiveAction({ title, message, confirmText = 'Видалити' }: ConfirmOptions) {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const complete = (value: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    Alert.alert(
      title,
      message,
      [
        {
          text: 'Скасувати',
          style: 'cancel',
          onPress: () => complete(false),
        },
        {
          text: confirmText,
          style: 'destructive',
          onPress: () => complete(true),
        },
      ],
      {
        cancelable: true,
        onDismiss: () => complete(false),
      }
    );
  });
}

async function readPickedFileAsText(asset: DocumentPicker.DocumentPickerAsset) {
  const webFile = (asset as { file?: File }).file;
  if (webFile && typeof webFile.text === 'function') {
    return webFile.text();
  }

  const response = await fetch(asset.uri);
  if (!response.ok) {
    throw new Error('Не вдалося прочитати файл');
  }
  return response.text();
}

export default function FavoritesScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= 1180;
  const isTablet = width >= 820;
  const isPhone = width < 768;
  const isSmallPhone = width < 420;
  const compactShareRow = width < 720;
  const compactActionButtons = width < 520;
  const { scrollRef, showScrollTop, onScroll, scrollToTop } = useScrollTop(520);

  const {
    resolvedTheme,
    user,
    isAuthenticated,
    favorites,
    favoritesLoading,
    favoritesError,
    refreshFavorites,
    patchFavorite,
    deleteFavoriteById,
  } = useAppContext();

  const [showOnlyWatched, setShowOnlyWatched] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [queryInput, setQueryInput] = useState('');
  const [shareTitle, setShareTitle] = useState('');
  const [shareExpiresDays, setShareExpiresDays] = useState('7');
  const [shareLinks, setShareLinks] = useState<CollectionShareLink[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [banner, setBanner] = useState<StatusBannerState>(null);
  const [editing, setEditing] = useState<Record<string, { personalRating: string; notes: string }>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [statusUpdatingIds, setStatusUpdatingIds] = useState<Record<string, true>>({});
  const [manualImportOpen, setManualImportOpen] = useState(false);
  const [manualImportLoading, setManualImportLoading] = useState(false);
  const [manualImportText, setManualImportText] = useState('');
  const [lastExportJson, setLastExportJson] = useState<string | null>(null);
  const statusUpdatingIdsRef = useRef<Record<string, true>>({});
  const latestRefreshRequestIdRef = useRef(0);
  const canSeeExperimentalUpload = __DEV__;
  const skeletonCount = isWide ? 4 : isTablet ? 3 : 2;
  const query = useDebouncedValue(queryInput, 200);

  const palette = useMemo(() => {
    const theme = getThemeTokens(resolvedTheme);
    return {
      pageBg: theme.colors.pageBg,
      panelBg: theme.colors.panelBg,
      cardBg: theme.colors.cardBg,
      textMain: theme.colors.textMain,
      textMuted: theme.colors.textMuted,
      border: theme.colors.border,
      primary: theme.colors.primary,
      secondary: theme.colors.secondary,
      success: theme.colors.success,
      danger: theme.colors.danger,
      info: theme.colors.info,
      warning: theme.colors.warning,
    };
  }, [resolvedTheme]);

  const favoriteCardPalette = useMemo(
    () => ({
      cardBg: palette.cardBg,
      panelBg: palette.panelBg,
      border: palette.border,
      textMain: palette.textMain,
      textMuted: palette.textMuted,
      primary: palette.primary,
      success: palette.success,
      info: palette.info,
      danger: palette.danger,
    }),
    [palette]
  );

  const shareCardPalette = useMemo(
    () => ({
      cardBg: palette.cardBg,
      border: palette.border,
      textMain: palette.textMain,
      textMuted: palette.textMuted,
      danger: palette.danger,
      info: palette.info,
      warning: palette.warning,
      primary: palette.primary,
    }),
    [palette]
  );

  const sortedFavorites = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = favorites.filter((item) => {
      if (showOnlyWatched && !item.watched) {
        return false;
      }
      if (!q) {
        return true;
      }

      return (
        item.title.toLowerCase().includes(q) ||
        (item.notes ?? '').toLowerCase().includes(q) ||
        String(item.year ?? '').includes(q) ||
        item.mediaType.toLowerCase().includes(q)
      );
    });
    const result = [...filtered];

    if (sortMode === 'rating-desc') {
      result.sort((a, b) => (b.personalRating ?? b.rating ?? 0) - (a.personalRating ?? a.rating ?? 0));
    } else if (sortMode === 'title-asc') {
      result.sort((a, b) => a.title.localeCompare(b.title, 'uk'));
    } else {
      result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    return result;
  }, [favorites, query, showOnlyWatched, sortMode]);

  const stats = useMemo(() => {
    const watched = favorites.filter((item) => item.watched).length;
    const movies = favorites.filter((item) => item.mediaType === 'movie').length;
    const tv = favorites.filter((item) => item.mediaType === 'tv').length;
    return {
      total: favorites.length,
      watched,
      planned: Math.max(0, favorites.length - watched),
      movies,
      tv,
    };
  }, [favorites]);

  const manualImportBytes = manualImportText.length;
  const manualImportTooLarge = manualImportBytes > MAX_IMPORT_JSON_BYTES;
  const manualImportSizeLabel = useMemo(
    () => `${formatBytes(manualImportBytes)} / ${formatBytes(MAX_IMPORT_JSON_BYTES)}`,
    [manualImportBytes]
  );

  const reloadShareLinks = useCallback(async () => {
    if (!isAuthenticated) {
      setShareLinks([]);
      return;
    }

    setShareLoading(true);
    try {
      const items = await listCollectionShareLinks();
      setShareLinks(items);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося завантажити share-посилання';
      setBanner({ type: 'error', message });
    } finally {
      setShareLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    reloadShareLinks().catch(() => {
      // already handled in reloadShareLinks
    });
  }, [reloadShareLinks, user?.id]);

  useEffect(() => {
    statusUpdatingIdsRef.current = statusUpdatingIds;
  }, [statusUpdatingIds]);

  const getDraft = useCallback(
    (item: FavoriteMovie) => {
      return (
        editing[item.id] ?? {
          personalRating: item.personalRating?.toString() ?? '',
          notes: item.notes ?? '',
        }
      );
    },
    [editing]
  );

  const onDraftPersonalRatingChange = useCallback((itemId: string, value: string) => {
    setEditing((prev) => ({
      ...prev,
      [itemId]: {
        personalRating: value,
        notes: prev[itemId]?.notes ?? '',
      },
    }));
  }, []);

  const onDraftNotesChange = useCallback((itemId: string, value: string) => {
    setEditing((prev) => ({
      ...prev,
      [itemId]: {
        personalRating: prev[itemId]?.personalRating ?? '',
        notes: value,
      },
    }));
  }, []);

  const saveFavoriteChanges = useCallback(async (item: FavoriteMovie) => {
    try {
      const draft = getDraft(item);
      const parsedRating = parsePersonalRatingInput(draft.personalRating);
      if (parsedRating.error) {
        setBanner({ type: 'error', message: parsedRating.error });
        return;
      }

      await patchFavorite(item.id, {
        personalRating: parsedRating.value,
        notes: draft.notes,
      });
      setBanner({ type: 'success', message: `Збережено: ${item.title}` });
      setEditing((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося зберегти зміни';
      setBanner({ type: 'error', message });
    }
  }, [getDraft, patchFavorite]);

  const toggleWatched = useCallback(async (item: FavoriteMovie) => {
    if (statusUpdatingIdsRef.current[item.id]) {
      return;
    }

    statusUpdatingIdsRef.current = { ...statusUpdatingIdsRef.current, [item.id]: true };
    setStatusUpdatingIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      await patchFavorite(item.id, { watched: !item.watched });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося оновити статус';
      setBanner({ type: 'error', message });
    } finally {
      if (statusUpdatingIdsRef.current[item.id]) {
        const nextRef = { ...statusUpdatingIdsRef.current };
        delete nextRef[item.id];
        statusUpdatingIdsRef.current = nextRef;
      }
      setStatusUpdatingIds((prev) => {
        if (!prev[item.id]) {
          return prev;
        }
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  }, [patchFavorite]);

  const removeItem = useCallback(async (item: FavoriteMovie) => {
    const confirmed = await confirmDestructiveAction({
      title: 'Видалити елемент?',
      message: `Елемент «${item.title}» буде видалено з вашої колекції.`,
    });
    if (!confirmed) {
      return;
    }

    try {
      await deleteFavoriteById(item.id);
      setBanner({ type: 'success', message: `Видалено: ${item.title}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося видалити';
      setBanner({ type: 'error', message });
    }
  }, [deleteFavoriteById]);

  const openFavoriteDetails = useCallback((item: FavoriteMovie) => {
    if (item.mediaType === 'movie') {
      router.push(`/movie/${item.tmdbId}` as never);
      return;
    }
    router.push(`/tv/${item.tmdbId}` as never);
  }, []);

  const importFavoritesFromRaw = useCallback(async (raw: string) => {
    const parsed = parseFavoritesImportPayload(raw);
    if (!parsed.items) {
      setBanner({ type: 'error', message: parsed.error ?? 'Невалідний формат імпорту.' });
      return false;
    }

    const response = await importFavoritesCollection(parsed.items, 'merge');
    await refreshFavorites();
    setBanner({
      type: 'success',
      message: `Імпорт: +${response.imported}, пропущено ${response.skipped}.`,
    });
    return true;
  }, [refreshFavorites]);

  const handleUploadVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        type: ['video/*', 'video/x-msvideo'],
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      const response = await uploadVideoFile({
        uri: asset.uri,
        name: asset.name ?? 'video.avi',
        mimeType: asset.mimeType ?? 'video/x-msvideo',
      });

      setBanner({
        type: 'success',
        message: `Файл завантажено: ${response.item.originalName}`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Помилка завантаження файлу';
      setBanner({ type: 'error', message });
    }
  };

  const handleExportFavorites = async () => {
    try {
      const payload = await exportFavoritesCollection();
      const fileName = `favorites-${new Date().toISOString().slice(0, 10)}.json`;
      const json = JSON.stringify(payload, null, 2);
      setLastExportJson(json);
      let copiedToClipboard = false;

      if (Platform.OS === 'web') {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);

        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(json);
            copiedToClipboard = true;
          } catch {
            // clipboard may be blocked by browser permissions
          }
        }
      }

      const exportMessage =
        Platform.OS === 'web'
          ? `Експортовано ${payload.items.length} елемент(ів). Файл збережено у "Завантаженнях" браузера.${copiedToClipboard ? ' JSON також скопійовано у буфер обміну.' : ''}`
          : `Експортовано ${payload.items.length} елемент(ів).`;
      setBanner({ type: 'success', message: exportMessage });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Помилка експорту';
      setBanner({ type: 'error', message });
    }
  };

  const handleImportFavorites = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        type: ['application/json', 'text/json', 'text/plain'],
      });
      if (result.canceled || !result.assets[0]) {
        return;
      }

      const raw = await readPickedFileAsText(result.assets[0]);
      if (raw.length > MAX_IMPORT_JSON_BYTES) {
        setBanner({ type: 'error', message: `Файл JSON завеликий. Максимальний розмір: ${formatBytes(MAX_IMPORT_JSON_BYTES)}.` });
        return;
      }
      await importFavoritesFromRaw(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Помилка імпорту';
      setBanner({ type: 'error', message });
    }
  };

  const handleManualImport = useCallback(async () => {
    const raw = manualImportText.trim();
    if (!raw) {
      setBanner({ type: 'error', message: 'Вставте JSON перед імпортом.' });
      return;
    }
    if (raw.length > MAX_IMPORT_JSON_BYTES) {
      setBanner({ type: 'error', message: `Вставлений JSON завеликий. Максимальний розмір: ${formatBytes(MAX_IMPORT_JSON_BYTES)}.` });
      return;
    }

    setManualImportLoading(true);
    try {
      const imported = await importFavoritesFromRaw(raw);
      if (imported) {
        setManualImportOpen(false);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Помилка імпорту';
      setBanner({ type: 'error', message });
    } finally {
      setManualImportLoading(false);
    }
  }, [importFavoritesFromRaw, manualImportText]);

  const handlePasteFromClipboard = useCallback(async () => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.clipboard?.readText) {
      setBanner({ type: 'info', message: 'Буфер обміну недоступний. Вставте JSON вручну.' });
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setBanner({ type: 'info', message: 'Буфер обміну порожній.' });
        return;
      }
      setManualImportText(text);
      setBanner({ type: 'success', message: 'JSON вставлено з буфера обміну.' });
    } catch {
      setBanner({ type: 'error', message: 'Немає доступу до буфера обміну браузера.' });
    }
  }, []);

  const handleCreateShareLink = async () => {
    try {
      const daysRaw = shareExpiresDays.trim();
      const parsedDays = Number(daysRaw);
      const expiresInDays = daysRaw ? parsedDays : null;
      if (
        daysRaw &&
        (!Number.isFinite(parsedDays) || !Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 365)
      ) {
        setBanner({ type: 'error', message: 'Термін дії посилання: вкажіть ціле число від 1 до 365.' });
        return;
      }

      const created = await createCollectionShareLink(
        shareTitle.trim(),
        Number.isFinite(expiresInDays) ? expiresInDays : null
      );
      setShareLinks((prev) => [created, ...prev]);
      setShareTitle('');
      setBanner({ type: 'success', message: created.expiresAt ? 'Публічне посилання створено з терміном дії.' : 'Публічне посилання створено безстроково.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося створити share-посилання';
      setBanner({ type: 'error', message });
    }
  };

  const handleDeleteShareLink = useCallback(async (share: CollectionShareLink) => {
    const confirmed = await confirmDestructiveAction({
      title: 'Видалити share‑посилання?',
      message: `Посилання «${share.title}» більше не буде доступне.`,
    });
    if (!confirmed) {
      return;
    }

    try {
      await deleteCollectionShareLink(share.id);
      setShareLinks((prev) => prev.filter((item) => item.id !== share.id));
      setBanner({ type: 'success', message: 'Share-посилання видалено.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося видалити share-посилання';
      setBanner({ type: 'error', message });
    }
  }, []);

  const handleCopyShareLink = useCallback(async (url: string) => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setBanner({ type: 'success', message: 'Посилання скопійовано.' });
        return;
      } catch {
        setBanner({ type: 'error', message: 'Немає доступу до буфера обміну браузера.' });
        return;
      }
    }

    setBanner({ type: 'info', message: `Посилання: ${url}` });
  }, []);

  const handleOpenShareLink = useCallback((share: CollectionShareLink) => {
    Linking.openURL(share.url).catch(() => {
      setBanner({ type: 'error', message: 'Не вдалося відкрити посилання' });
    });
  }, []);

  const handlePullRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }
    const refreshId = ++latestRefreshRequestIdRef.current;
    setRefreshing(true);
    try {
      await Promise.all([refreshFavorites(), reloadShareLinks()]);
      if (refreshId === latestRefreshRequestIdRef.current) {
        setBanner({ type: 'info', message: 'Дані колекції оновлено.' });
      }
    } catch (error) {
      if (refreshId === latestRefreshRequestIdRef.current) {
        const message = error instanceof Error ? error.message : 'Не вдалося оновити колекцію.';
        setBanner({ type: 'error', message });
      }
    } finally {
      if (refreshId === latestRefreshRequestIdRef.current) {
        setRefreshing(false);
      }
    }
  }, [refreshFavorites, refreshing, reloadShareLinks]);

  const handleRefreshFavorites = useCallback(async () => {
    if (favoritesLoading) {
      return;
    }
    try {
      await refreshFavorites();
      setBanner({ type: 'info', message: 'Колекцію оновлено.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не вдалося оновити колекцію.';
      setBanner({ type: 'error', message });
    }
  }, [favoritesLoading, refreshFavorites]);

  if (!isAuthenticated) {
    return (
      <AuthRequiredGate
        backgroundColor={palette.pageBg}
        titleColor={palette.textMain}
        textColor={palette.textMuted}
        buttonColor={palette.primary}
        title="Моя колекція"
        description="Увійдіть через Google або демо-вхід, щоб бачити і редагувати улюблені фільми та серіали."
        buttonLabel="Відкрити авторизацію"
        onPress={() => router.push('/auth')}
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: palette.pageBg }]}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.container, isPhone && styles.containerPhone, { backgroundColor: palette.pageBg }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            tintColor={palette.primary}
            colors={[palette.primary]}
          />
        }>
      <ScreenPanel
        backgroundColor={palette.panelBg}
        borderColor={palette.border}
        style={styles.contentWidth}>
        <Text style={[styles.title, { color: palette.textMain }]}>Моя колекція</Text>
        <Text style={[styles.subtitle, { color: palette.textMuted }]}>
          {user?.name} • {favorites.length} елемент(ів)
        </Text>
        {favoritesError ? (
          <View style={[styles.collectionWarning, { backgroundColor: palette.cardBg, borderColor: palette.warning }]}>
            <View style={styles.collectionWarningHead}>
              <Ionicons name="warning-outline" size={15} color={palette.warning} />
              <Text style={[styles.collectionWarningText, { color: palette.textMain }]}>{favoritesError}</Text>
            </View>
            <Pressable
              style={[
                styles.collectionWarningRetry,
                favoritesLoading && styles.filterBtnDisabled,
                { backgroundColor: palette.info },
              ]}
              disabled={favoritesLoading}
              onPress={handleRefreshFavorites}>
              <Ionicons name="refresh-outline" size={14} color="#ffffff" />
              <Text style={styles.filterBtnText}>{favoritesLoading ? 'Оновлення...' : 'Повторити запит'}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Ionicons name="albums-outline" size={14} color={palette.textMuted} />
            <Text style={[styles.statItem, { color: palette.textMuted }]}>Всього: {stats.total}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Ionicons name="film-outline" size={14} color={palette.textMuted} />
            <Text style={[styles.statItem, { color: palette.textMuted }]}>Фільми: {stats.movies}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Ionicons name="tv-outline" size={14} color={palette.textMuted} />
            <Text style={[styles.statItem, { color: palette.textMuted }]}>Серіали: {stats.tv}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Ionicons name="checkmark-done-outline" size={14} color={palette.textMuted} />
            <Text style={[styles.statItem, { color: palette.textMuted }]}>Переглянуто: {stats.watched}</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Ionicons name="time-outline" size={14} color={palette.textMuted} />
            <Text style={[styles.statItem, { color: palette.textMuted }]}>Заплановано: {stats.planned}</Text>
          </View>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <Ionicons name="search-outline" size={18} color={palette.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: palette.textMain }]}
            value={queryInput}
            onChangeText={setQueryInput}
            placeholder="Пошук по колекції (назва/нотатки/рік)"
            placeholderTextColor={palette.textMuted}
          />
        </View>
        {queryInput.trim() !== query.trim() ? (
          <Text style={[styles.searchPendingHint, { color: palette.textMuted }]}>Оновлюю фільтр...</Text>
        ) : null}

        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterBtn, { backgroundColor: sortMode === 'recent' ? palette.primary : palette.cardBg }]}
            onPress={() => setSortMode('recent')}>
            <Ionicons name="sparkles-outline" size={14} color="#ffffff" />
            <Text style={styles.filterBtnText}>Нові</Text>
          </Pressable>
          <Pressable
            style={[
            styles.filterBtn,
              { backgroundColor: sortMode === 'rating-desc' ? palette.primary : palette.cardBg },
            ]}
            onPress={() => setSortMode('rating-desc')}>
            <Ionicons name="star-outline" size={14} color="#ffffff" />
            <Text style={styles.filterBtnText}>Рейтинг</Text>
          </Pressable>
          <Pressable
            style={[styles.filterBtn, { backgroundColor: sortMode === 'title-asc' ? palette.primary : palette.cardBg }]}
            onPress={() => setSortMode('title-asc')}>
            <Ionicons name="text-outline" size={14} color="#ffffff" />
            <Text style={styles.filterBtnText}>A-Z</Text>
          </Pressable>
        </View>

        <View style={[styles.filterRow, compactActionButtons && styles.filterRowStacked]}>
          <Pressable
            style={[styles.filterBtn, compactActionButtons && styles.filterBtnCompact, { backgroundColor: showOnlyWatched ? palette.success : palette.cardBg }]}
            onPress={() => setShowOnlyWatched((prev) => !prev)}>
            <Ionicons name={showOnlyWatched ? 'checkmark-done-outline' : 'albums-outline'} size={14} color="#ffffff" />
            <Text style={styles.filterBtnText}>{showOnlyWatched ? 'Лише переглянуті' : 'Усі'}</Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterBtn,
              compactActionButtons && styles.filterBtnCompact,
              favoritesLoading && styles.filterBtnDisabled,
              { backgroundColor: palette.info },
            ]}
            disabled={favoritesLoading}
            onPress={handleRefreshFavorites}>
            <Ionicons name="refresh-outline" size={14} color="#ffffff" />
            <Text style={styles.filterBtnText}>{favoritesLoading ? 'Оновлення...' : 'Оновити'}</Text>
          </Pressable>
          {canSeeExperimentalUpload ? (
            <Pressable style={[styles.filterBtn, compactActionButtons && styles.filterBtnCompact, { backgroundColor: palette.warning }]} onPress={handleUploadVideo}>
              <Ionicons name="videocam-outline" size={14} color="#ffffff" />
              <Text style={styles.filterBtnText}>Завантажити AVI</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.filterRow, compactActionButtons && styles.filterRowStacked]}>
          <Pressable style={[styles.filterBtn, compactActionButtons && styles.filterBtnCompact, { backgroundColor: palette.info }]} onPress={handleExportFavorites}>
            <Ionicons name="download-outline" size={14} color="#ffffff" />
            <Text style={styles.filterBtnText}>Експорт JSON</Text>
          </Pressable>
          <Pressable style={[styles.filterBtn, compactActionButtons && styles.filterBtnCompact, { backgroundColor: palette.primary }]} onPress={handleImportFavorites}>
            <Ionicons name="cloud-upload-outline" size={14} color="#ffffff" />
            <Text style={styles.filterBtnText}>Імпорт JSON</Text>
          </Pressable>
          <Pressable
            style={[styles.filterBtn, compactActionButtons && styles.filterBtnCompact, { backgroundColor: palette.secondary }]}
            onPress={() => setManualImportOpen((prev) => !prev)}>
            <Ionicons name={manualImportOpen ? 'chevron-up-outline' : 'clipboard-outline'} size={14} color="#ffffff" />
            <Text style={styles.filterBtnText}>{manualImportOpen ? 'Сховати вставку' : 'Вставити JSON'}</Text>
          </Pressable>
        </View>

        {manualImportOpen ? (
          <View style={[styles.manualImportPanel, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <Text style={[styles.manualImportTitle, { color: palette.textMain }]}>Ручний імпорт JSON</Text>
            <Text style={[styles.manualImportHint, { color: palette.textMuted }]}>
              Вставте JSON колекції у поле нижче. Це зручно, якщо файловий доступ у браузері обмежений.
            </Text>
            <View style={styles.manualImportMetaRow}>
              <Text
                style={[
                  styles.manualImportMetaText,
                  { color: manualImportTooLarge ? palette.danger : palette.textMuted },
                ]}>
                Розмір JSON: {manualImportSizeLabel}
              </Text>
              {manualImportTooLarge ? (
                <Text style={[styles.manualImportMetaText, { color: palette.danger }]}>Перевищено ліміт</Text>
              ) : null}
            </View>
            <TextInput
              style={[styles.manualImportInput, { backgroundColor: palette.panelBg, borderColor: palette.border, color: palette.textMain }]}
              value={manualImportText}
              onChangeText={setManualImportText}
              placeholder='{"version":2,"items":[...]}'
              placeholderTextColor={palette.textMuted}
              multiline
              textAlignVertical="top"
            />
            <View style={[styles.filterRow, isSmallPhone && styles.filterRowStacked]}>
              <Pressable
                style={[styles.filterBtn, isSmallPhone && styles.filterBtnCompact, { backgroundColor: palette.info }]}
                onPress={handlePasteFromClipboard}>
                <Ionicons name="clipboard-outline" size={14} color="#ffffff" />
                <Text style={styles.filterBtnText}>Вставити з буфера</Text>
              </Pressable>
              {lastExportJson ? (
                <Pressable
                  style={[styles.filterBtn, isSmallPhone && styles.filterBtnCompact, { backgroundColor: palette.secondary }]}
                  onPress={() => {
                    setManualImportText(lastExportJson);
                    setBanner({ type: 'info', message: 'Підставлено JSON останнього експорту.' });
                  }}>
                  <Ionicons name="document-text-outline" size={14} color="#ffffff" />
                  <Text style={styles.filterBtnText}>Останній експорт</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.filterBtn, isSmallPhone && styles.filterBtnCompact, { backgroundColor: palette.warning }]}
                onPress={() => setManualImportText('')}>
                <Ionicons name="trash-outline" size={14} color="#ffffff" />
                <Text style={styles.filterBtnText}>Очистити</Text>
              </Pressable>
            </View>
              <Pressable
                style={[
                  styles.filterBtn,
                  styles.filterBtnCompact,
                  (manualImportLoading || manualImportTooLarge || manualImportText.trim().length === 0) && styles.filterBtnDisabled,
                  { backgroundColor: palette.primary },
                ]}
                disabled={manualImportLoading || manualImportTooLarge || manualImportText.trim().length === 0}
                onPress={handleManualImport}>
                <Ionicons name={manualImportLoading ? 'hourglass-outline' : 'cloud-upload-outline'} size={14} color="#ffffff" />
                <Text style={styles.filterBtnText}>{manualImportLoading ? 'Імпорт...' : 'Імпортувати вставлений JSON'}</Text>
              </Pressable>
          </View>
        ) : null}

        <View style={[styles.shareSection, { borderColor: palette.border }]}>
          <Text style={[styles.shareTitle, { color: palette.textMain }]}>Публічний share-лінк колекції</Text>
          <View style={[styles.filterRow, compactShareRow && styles.filterRowStacked]}>
            <TextInput
              style={[
                styles.formInput,
                styles.shareInput,
                compactShareRow && styles.shareInputCompact,
                { backgroundColor: palette.cardBg, borderColor: palette.border, color: palette.textMain },
              ]}
              value={shareTitle}
              onChangeText={setShareTitle}
              placeholder="Назва для посилання (необов'язково)"
              placeholderTextColor={palette.textMuted}
            />
            <TextInput
              style={[
                styles.formInput,
                styles.shareExpireInput,
                compactShareRow && styles.shareExpireInputCompact,
                { backgroundColor: palette.cardBg, borderColor: palette.border, color: palette.textMain },
              ]}
              value={shareExpiresDays}
              onChangeText={(value) => setShareExpiresDays(value.replace(/\D/g, '').slice(0, 3))}
              placeholder="Днів"
              placeholderTextColor={palette.textMuted}
              keyboardType="number-pad"
            />
            <Pressable
              style={[
                styles.filterBtn,
                compactShareRow && styles.filterBtnCompact,
                { backgroundColor: palette.primary },
              ]}
              onPress={handleCreateShareLink}>
              <Ionicons name="share-social-outline" size={14} color="#ffffff" />
              <Text style={styles.filterBtnText}>Створити лінк</Text>
            </Pressable>
          </View>
          <Text style={{ color: palette.textMuted, fontSize: 12 }}>
            Порожнє поле «Днів» = безстрокове посилання. Рекомендовано: 7-30 днів.
          </Text>

          {shareLoading ? <Text style={{ color: palette.textMuted }}>Оновлення share-посилань...</Text> : null}
          {!shareLoading && shareLinks.length === 0 ? (
            <Text style={{ color: palette.textMuted }}>Ще немає share-посилань. Створіть перше посилання.</Text>
          ) : null}

          {shareLinks.map((item) => (
            <ShareLinkCard
              key={item.id}
              item={item}
              compact={compactShareRow}
              palette={shareCardPalette}
              onCopy={handleCopyShareLink}
              onOpen={handleOpenShareLink}
              onDelete={handleDeleteShareLink}
            />
          ))}
        </View>

        <StatusBanner
          banner={banner}
          errorColor={palette.danger}
          successColor={palette.success}
          infoColor={palette.textMain}
          containerStyle={styles.banner}
        />
      </ScreenPanel>

      {favoritesLoading && favorites.length === 0 ? (
        <View style={[styles.contentWidth, styles.cardsWrap, isWide && styles.cardsWrapWide]}>
          {Array.from({ length: skeletonCount }).map((_, index) => (
            <FavoriteCardSkeleton
              key={`favorite-skeleton:${index}`}
              wide={isWide}
              tablet={isTablet}
              compact={isPhone}
              surfaceColor={palette.cardBg}
              borderColor={palette.border}
            />
          ))}
        </View>
      ) : sortedFavorites.length === 0 ? (
        <ScreenPanel
          backgroundColor={palette.panelBg}
          borderColor={palette.border}
          style={styles.contentWidth}>
          <Text style={{ color: palette.textMuted }}>
            {favorites.length === 0
              ? 'Колекція порожня. Додайте фільми або серіали з вкладки пошуку.'
              : 'За поточними фільтрами нічого не знайдено.'}
          </Text>
        </ScreenPanel>
      ) : (
        <View style={[styles.contentWidth, styles.cardsWrap, isWide && styles.cardsWrapWide]}>
          {sortedFavorites.map((item) => {
            const draft = getDraft(item);
            return (
              <FavoriteCard
                key={item.id}
                item={item}
                personalRatingDraft={draft.personalRating}
                notesDraft={draft.notes}
                compact={isPhone}
                wide={isWide}
                tablet={isTablet}
                statusUpdating={Boolean(statusUpdatingIds[item.id])}
                palette={favoriteCardPalette}
                onPersonalRatingChange={onDraftPersonalRatingChange}
                onNotesChange={onDraftNotesChange}
                onOpenDetails={openFavoriteDetails}
                onToggleWatched={toggleWatched}
                onRemove={removeItem}
                onSave={saveFavoriteChanges}
              />
            );
          })}
        </View>
      )}
      </ScrollView>
      <ScrollTopFab
        visible={showScrollTop}
        backgroundColor={palette.primary}
        onPress={scrollToTop}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    gap: 12,
  },
  containerPhone: {
    padding: 12,
    gap: 10,
  },
  contentWidth: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    fontFamily: 'SpaceMono',
  },
  subtitle: {
    marginTop: 3,
    marginBottom: 10,
    fontSize: 14,
  },
  collectionWarning: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  collectionWarningHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  collectionWarningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  collectionWarningRetry: {
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  statChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statItem: {
    fontSize: 12,
    fontWeight: '700',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 14,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  searchWrap: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchPendingHint: {
    marginTop: -3,
    marginBottom: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  shareInput: {
    marginBottom: 0,
    minWidth: 260,
    flexGrow: 1,
  },
  shareInputCompact: {
    minWidth: '100%',
  },
  shareExpireInput: {
    marginBottom: 0,
    minWidth: 90,
    maxWidth: 110,
  },
  shareExpireInputCompact: {
    minWidth: 120,
    maxWidth: 140,
  },
  shareSection: {
    borderTopWidth: 1,
    marginTop: 4,
    paddingTop: 10,
    gap: 8,
  },
  shareTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  filterRowStacked: {
    flexDirection: 'column',
  },
  filterBtn: {
    borderRadius: 9,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterBtnCompact: {
    width: '100%',
    alignItems: 'center',
  },
  filterBtnDisabled: {
    opacity: 0.65,
  },
  manualImportPanel: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  manualImportTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  manualImportHint: {
    fontSize: 12,
    lineHeight: 18,
  },
  manualImportMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  manualImportMetaText: {
    fontSize: 11,
    fontWeight: '700',
  },
  manualImportInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 140,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace', default: 'monospace' }),
  },
  filterBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  banner: {
    marginTop: 4,
  },
  cardsWrap: {
    gap: 12,
  },
  cardsWrapWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
