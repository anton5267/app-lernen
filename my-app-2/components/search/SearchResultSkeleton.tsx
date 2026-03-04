import { StyleSheet, View } from 'react-native';

import { SkeletonBlock } from '@/components/common/SkeletonBlock';

type SearchResultSkeletonProps = {
  layoutMode: 'single' | 'double' | 'triple';
  compact?: boolean;
  surfaceColor: string;
  borderColor: string;
};

export function SearchResultSkeleton({
  layoutMode,
  compact = false,
  surfaceColor,
  borderColor,
}: SearchResultSkeletonProps) {
  return (
    <View
      style={[
        styles.card,
        layoutMode === 'double' && styles.cardDouble,
        layoutMode === 'triple' && styles.cardTriple,
        { backgroundColor: surfaceColor, borderColor },
      ]}>
      <SkeletonBlock style={styles.poster} />
      <View style={styles.info}>
        <SkeletonBlock style={styles.badge} />
        <SkeletonBlock style={styles.title} />
        <SkeletonBlock style={styles.meta} />
      </View>
      <View style={[styles.actions, compact && styles.actionsCompact]}>
        <SkeletonBlock style={styles.actionButton} />
        <SkeletonBlock style={styles.actionButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  cardDouble: {
    width: '49.2%',
  },
  cardTriple: {
    width: '32.4%',
  },
  poster: {
    width: '100%',
    aspectRatio: 2 / 3,
    borderRadius: 10,
  },
  info: {
    gap: 8,
  },
  badge: {
    width: 92,
    height: 20,
    borderRadius: 999,
  },
  title: {
    width: '90%',
    height: 22,
    borderRadius: 8,
  },
  meta: {
    width: '70%',
    height: 14,
    borderRadius: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionsCompact: {
    flexDirection: 'column',
  },
  actionButton: {
    flex: 1,
    height: 34,
    borderRadius: 9,
  },
});
