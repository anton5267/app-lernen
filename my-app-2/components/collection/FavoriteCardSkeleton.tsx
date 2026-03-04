import { StyleSheet, View } from 'react-native';

import { SkeletonBlock } from '@/components/common/SkeletonBlock';

type FavoriteCardSkeletonProps = {
  wide: boolean;
  tablet: boolean;
  compact?: boolean;
  surfaceColor: string;
  borderColor: string;
};

export function FavoriteCardSkeleton({
  wide,
  tablet,
  compact = false,
  surfaceColor,
  borderColor,
}: FavoriteCardSkeletonProps) {
  return (
    <View
      style={[
        styles.card,
        wide && styles.cardWide,
        { backgroundColor: surfaceColor, borderColor },
      ]}>
      <SkeletonBlock style={[styles.poster, tablet && styles.posterTablet]} />
      <View style={styles.badges}>
        <SkeletonBlock style={styles.badge} />
        <SkeletonBlock style={styles.badge} />
      </View>
      <SkeletonBlock style={styles.title} />
      <SkeletonBlock style={styles.meta} />
      <SkeletonBlock style={styles.metaShort} />
      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <SkeletonBlock style={styles.action} />
        <SkeletonBlock style={styles.action} />
        <SkeletonBlock style={styles.action} />
      </View>
      <SkeletonBlock style={styles.input} />
      <SkeletonBlock style={styles.notes} />
      <SkeletonBlock style={styles.save} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  cardWide: {
    width: '49%',
  },
  poster: {
    width: '100%',
    height: 220,
    borderRadius: 10,
  },
  posterTablet: {
    height: 250,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    width: 92,
    height: 20,
    borderRadius: 999,
  },
  title: {
    width: '82%',
    height: 24,
    borderRadius: 8,
  },
  meta: {
    width: '88%',
    height: 14,
    borderRadius: 8,
  },
  metaShort: {
    width: '50%',
    height: 14,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionsCompact: {
    flexDirection: 'column',
    flexWrap: 'nowrap',
  },
  action: {
    width: 112,
    height: 36,
    borderRadius: 9,
  },
  input: {
    height: 42,
    borderRadius: 10,
  },
  notes: {
    height: 72,
    borderRadius: 10,
  },
  save: {
    height: 40,
    borderRadius: 9,
  },
});
