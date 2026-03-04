import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  DataSourceMode,
  resolveDataStateReason,
  resolveDataStateTone,
  shouldRenderDataStateBanner,
} from './dataState';

type DataStateBannerProps = {
  mode: DataSourceMode;
  reason?: string | null;
  hint?: string | null;
  canSeeDebug: boolean;
  textColor: string;
  mutedColor: string;
  borderColor: string;
  backgroundColor: string;
  warningColor: string;
  infoColor: string;
};

function DataStateBannerComponent({
  mode,
  reason,
  hint,
  canSeeDebug,
  textColor,
  mutedColor,
  borderColor,
  backgroundColor,
  warningColor,
  infoColor,
}: DataStateBannerProps) {
  const friendlyReason = resolveDataStateReason({ mode, reason });
  const tone = resolveDataStateTone({ mode, reason });
  const accentColor = tone === 'warning' ? warningColor : tone === 'info' ? infoColor : borderColor;
  const toneIcon: keyof typeof Ionicons.glyphMap =
    tone === 'warning' ? 'warning-outline' : tone === 'info' ? 'information-circle-outline' : 'albums-outline';

  if (!shouldRenderDataStateBanner({ mode, reason, hint, canSeeDebug })) {
    return null;
  }

  return (
    <View style={[styles.wrap, { borderColor, backgroundColor }]}>
      <View style={[styles.accent, { backgroundColor: accentColor }]} />
      {canSeeDebug ? (
        <Text style={[styles.modeText, { color: textColor }]}>
          Джерело даних: {mode === 'demo' ? 'Demo' : 'Real'}
        </Text>
      ) : null}
      {friendlyReason ? (
        <View style={styles.reasonRow}>
          <Ionicons name={toneIcon} size={14} color={accentColor} />
          <Text style={[styles.reasonText, { color: textColor }]}>{friendlyReason}</Text>
        </View>
      ) : null}
      {hint ? <Text style={[styles.hintText, { color: mutedColor }]}>{hint}</Text> : null}
    </View>
  );
}

export const DataStateBanner = memo(DataStateBannerComponent);

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 4,
    overflow: 'hidden',
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 3,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
  },
  hintText: {
    fontSize: 12,
    lineHeight: 18,
  },
});
