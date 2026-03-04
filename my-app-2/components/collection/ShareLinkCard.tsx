import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { buildShareExpiryMeta } from '@/features/collection/share';
import { CollectionShareLink } from '@/types/api';

export type ShareLinkCardPalette = {
  cardBg: string;
  border: string;
  textMain: string;
  textMuted: string;
  danger: string;
  info: string;
  warning: string;
  primary: string;
};

type ShareLinkCardProps = {
  item: CollectionShareLink;
  palette: ShareLinkCardPalette;
  compact?: boolean;
  onCopy: (url: string) => void;
  onOpen: (item: CollectionShareLink) => void;
  onDelete: (item: CollectionShareLink) => void;
};

function ShareLinkCardComponent({ item, palette, compact = false, onCopy, onOpen, onDelete }: ShareLinkCardProps) {
  const expiryMeta = buildShareExpiryMeta({
    expiresAt: item.expiresAt,
    expired: item.expired,
  });

  const expiryColor =
    expiryMeta.status === 'expired'
      ? palette.danger
      : expiryMeta.status === 'expiring-soon'
        ? palette.warning
        : palette.textMuted;

  const badgeBg =
    expiryMeta.status === 'expired'
      ? palette.danger
      : expiryMeta.status === 'expiring-soon'
        ? palette.warning
        : expiryMeta.status === 'no-expiry'
          ? palette.info
          : palette.primary;

  return (
    <View style={[styles.shareCard, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.shareName, { color: palette.textMain }]}>{item.title}</Text>
        <Text style={[styles.statusBadge, { backgroundColor: badgeBg }]}>{expiryMeta.badge}</Text>
      </View>

      <Text selectable style={[styles.shareUrl, { color: palette.textMuted }]}>
        {item.url}
      </Text>
      <Text style={[styles.shareUrl, { color: expiryColor }]}>
        {expiryMeta.label}
      </Text>
      <View style={[styles.filterRow, compact && styles.filterRowCompact]}>
        <Pressable
          style={(state) => [
            styles.filterBtn,
            compact && styles.filterBtnCompact,
            state.pressed && styles.filterBtnPressed,
            Boolean((state as { hovered?: boolean }).hovered) && styles.filterBtnHover,
            { backgroundColor: palette.info },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Копіювати share-посилання: ${item.title}`}
          onPress={() => onCopy(item.url)}>
          <Ionicons name="copy-outline" size={14} color="#ffffff" />
          <Text style={styles.filterBtnText}>Копіювати</Text>
        </Pressable>
        <Pressable
          style={(state) => [
            styles.filterBtn,
            compact && styles.filterBtnCompact,
            item.expired && styles.filterBtnDisabled,
            state.pressed && !item.expired && styles.filterBtnPressed,
            Boolean((state as { hovered?: boolean }).hovered) && !item.expired && styles.filterBtnHover,
            { backgroundColor: item.expired ? palette.warning : palette.primary },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Відкрити share-посилання: ${item.title}`}
          disabled={item.expired}
          onPress={() => onOpen(item)}>
          <Ionicons name={item.expired ? 'time-outline' : 'open-outline'} size={14} color="#ffffff" />
          <Text style={styles.filterBtnText}>Відкрити</Text>
        </Pressable>
        <Pressable
          style={(state) => [
            styles.filterBtn,
            compact && styles.filterBtnCompact,
            state.pressed && styles.filterBtnPressed,
            Boolean((state as { hovered?: boolean }).hovered) && styles.filterBtnHover,
            { backgroundColor: palette.danger },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Видалити share-посилання: ${item.title}`}
          onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={14} color="#ffffff" />
          <Text style={styles.filterBtnText}>Видалити</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const ShareLinkCard = memo(ShareLinkCardComponent);

const styles = StyleSheet.create({
  shareCard: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  shareName: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusBadge: {
    color: '#ffffff',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    fontSize: 11,
    fontWeight: '800',
    overflow: 'hidden',
  },
  shareUrl: {
    fontSize: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterRowCompact: {
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
    justifyContent: 'center',
  },
  filterBtnDisabled: {
    opacity: 0.7,
  },
  filterBtnPressed: {
    transform: [{ scale: 0.99 }],
  },
  filterBtnHover: {
    transform: [{ translateY: -1 }],
  },
  filterBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
});
