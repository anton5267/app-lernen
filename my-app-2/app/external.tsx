import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { ActionButton } from '@/components/common/ActionButton';
import { useAppContext } from '@/context/AppContext';
import { trackViewingHistory } from '@/services/movieApi';
import { getThemeTokens } from '@/theme/tokens';

type ExternalSource = 'youtube' | 'twitch';

function parseSource(value: string | string[] | undefined): ExternalSource {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === 'twitch' ? 'twitch' : 'youtube';
}

function parseSingle(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw ?? '').trim();
}

function decodeMaybe(value: string) {
  if (!value) {
    return '';
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default function ExternalPlayerScreen() {
  const params = useLocalSearchParams();
  const source = parseSource(params.source);
  const id = parseSingle(params.id);
  const channel = decodeMaybe(parseSingle(params.channel));
  const { resolvedTheme, isAuthenticated } = useAppContext();
  const [webLoading, setWebLoading] = useState(true);
  const [webError, setWebError] = useState(false);
  const [webKey, setWebKey] = useState(0);
  const webViewUnsupported = Platform.OS === 'web';

  const palette = useMemo(() => {
    const theme = getThemeTokens(resolvedTheme);
    return {
      pageBg: theme.colors.pageBg,
      cardBg: theme.colors.cardBg,
      textMain: theme.colors.textMain,
      textMuted: theme.colors.textMuted,
      border: theme.colors.border,
      primary: theme.colors.primary,
      info: theme.colors.info,
      warning: theme.colors.warning,
    };
  }, [resolvedTheme]);

  const embedConfig = useMemo(() => {
    if (source === 'youtube') {
      return {
        title: 'Плеєр YouTube',
        embedUrl: id ? `https://www.youtube.com/embed/${id}?autoplay=0&rel=0` : '',
        externalUrl: id ? `https://www.youtube.com/watch?v=${id}` : 'https://www.youtube.com',
      };
    }

    const channelName = channel || id;
    const parent =
      typeof window !== 'undefined' && window.location?.hostname ? window.location.hostname : 'localhost';
    return {
      title: 'Плеєр Twitch',
      embedUrl: channelName
        ? `https://player.twitch.tv/?channel=${channelName}&parent=${parent}&autoplay=false`
        : '',
      externalUrl: channelName ? `https://www.twitch.tv/${channelName}` : 'https://www.twitch.tv',
    };
  }, [channel, id, source]);

  const hasPlayableTarget = useMemo(() => {
    if (source === 'youtube') {
      return id.length > 0;
    }
    return (channel || id).length > 0;
  }, [channel, id, source]);

  const sourceLabel = source === 'youtube' ? 'YouTube' : 'Twitch';
  const helperText = !hasPlayableTarget
    ? 'Не знайдено ID або назву каналу для відтворення. Поверніться до пошуку і відкрийте результат повторно.'
    : webViewUnsupported
      ? 'Плеєр недоступний у web-версії. Скористайтесь кнопкою «Відкрити оригінал», щоб перейти напряму на YouTube або Twitch.'
      : 'Якщо вбудований плеєр не завантажився, натисніть «Перезапустити плеєр» або відкрийте оригінал.';

  const handleReloadPlayer = useCallback(() => {
    if (!hasPlayableTarget) {
      return;
    }
    setWebError(false);
    setWebLoading(true);
    setWebKey((prev) => prev + 1);
  }, [hasPlayableTarget]);

  const handleOpenOriginal = useCallback(() => {
    Linking.openURL(embedConfig.externalUrl).catch(() => {
      // non-fatal
    });
  }, [embedConfig.externalUrl]);

  useEffect(() => {
    if (!isAuthenticated || !id || !hasPlayableTarget) {
      return;
    }

    const title = source === 'youtube' ? `YouTube • ${id}` : `Twitch • ${channel || id}`;
    trackViewingHistory({
      mediaType: source,
      contentId: id,
      title,
      externalUrl: embedConfig.externalUrl,
      channelTitle: channel || null,
      poster: null,
      rating: null,
      year: null,
    }).catch(() => {
      // non-fatal
    });
  }, [channel, embedConfig.externalUrl, hasPlayableTarget, id, isAuthenticated, source]);

  return (
    <>
      <Stack.Screen options={{ title: embedConfig.title }} />
      <View style={[styles.container, { backgroundColor: palette.pageBg }]}> 
        <View style={[styles.metaPanel, { backgroundColor: palette.cardBg, borderColor: palette.border }]}> 
          <View style={styles.metaBadgeRow}>
            <Text style={[styles.sourceBadge, { backgroundColor: palette.primary }]}>{sourceLabel}</Text>
            {channel ? (
              <Text style={[styles.channelText, { color: palette.textMain }]} numberOfLines={1}>
                Канал: {channel}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.helper, { color: hasPlayableTarget ? palette.textMuted : palette.warning }]}>
            {helperText}
          </Text>
        </View>

        <View style={[styles.playerWrap, { borderColor: palette.border, backgroundColor: palette.cardBg }]}> 
          {hasPlayableTarget ? (
            webViewUnsupported ? (
              <View style={styles.invalidTargetWrap}>
                <Ionicons name="information-circle-outline" size={22} color={palette.info} />
                <Text style={[styles.invalidTargetTitle, { color: palette.textMain }]}>Плеєр недоступний у web</Text>
                <Text style={[styles.invalidTargetText, { color: palette.textMuted }]}>
                  Вбудоване відтворення на цій платформі недоступне. Натисніть кнопку «Відкрити оригінал».
                </Text>
                <ActionButton
                  compact
                  label="Відкрити оригінал"
                  iconName="open-outline"
                  backgroundColor={palette.primary}
                  onPress={handleOpenOriginal}
                />
              </View>
            ) : (
              <>
                <WebView
                  key={webKey}
                  source={{ uri: embedConfig.embedUrl }}
                  style={styles.webview}
                  onLoadStart={() => {
                    setWebLoading(true);
                    setWebError(false);
                  }}
                  onLoadEnd={() => {
                    setWebLoading(false);
                  }}
                  onError={() => {
                    setWebLoading(false);
                    setWebError(true);
                  }}
                  onHttpError={() => {
                    setWebLoading(false);
                    setWebError(true);
                  }}
                />
                {webLoading ? (
                  <View style={styles.overlay}>
                    <ActivityIndicator size="small" color={palette.primary} />
                    <Text style={[styles.overlayText, { color: palette.textMuted }]}>Завантаження плеєра...</Text>
                  </View>
                ) : null}
                {webError ? (
                  <View style={[styles.overlay, { backgroundColor: '#0b0f18ee' }]}>
                    <Ionicons name="warning-outline" size={18} color={palette.textMuted} />
                    <Text style={[styles.overlayText, { color: palette.textMuted }]}>
                      Плеєр недоступний. Скористайтесь кнопкою «Відкрити оригінал».
                    </Text>
                    <View style={styles.overlayActions}>
                      <ActionButton
                        compact
                        label="Перезапустити"
                        iconName="refresh-outline"
                        backgroundColor={palette.info}
                        onPress={handleReloadPlayer}
                      />
                      <ActionButton
                        compact
                        label="Відкрити оригінал"
                        iconName="open-outline"
                        backgroundColor={palette.primary}
                        onPress={handleOpenOriginal}
                      />
                    </View>
                  </View>
                ) : null}
              </>
            )
          ) : (
            <View style={styles.invalidTargetWrap}>
              <Ionicons name="alert-circle-outline" size={22} color={palette.warning} />
              <Text style={[styles.invalidTargetTitle, { color: palette.textMain }]}>Немає даних для відтворення</Text>
              <Text style={[styles.invalidTargetText, { color: palette.textMuted }]}> 
                Параметри сторінки пошкоджені або застарілі. Відкрийте контент повторно зі списку пошуку.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonsRow}>
          {!webViewUnsupported ? (
            <ActionButton
              label="Перезапустити плеєр"
              iconName="refresh-outline"
              backgroundColor={palette.info}
              disabled={!hasPlayableTarget}
              onPress={handleReloadPlayer}
            />
          ) : null}
          <ActionButton
            label="Відкрити оригінал"
            iconName="open-outline"
            backgroundColor={palette.primary}
            onPress={handleOpenOriginal}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 10,
  },
  metaPanel: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  metaBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  sourceBadge: {
    color: '#ffffff',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  channelText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  playerWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 320,
  },
  webview: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0b0f1860',
    padding: 12,
  },
  overlayText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  helper: {
    fontSize: 12,
  },
  invalidTargetWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  invalidTargetTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  invalidTargetText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 420,
    lineHeight: 19,
  },
  overlayActions: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  buttonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
