import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';

import { MovieSort } from '@/types/movie';

type MovieFiltersProps = {
  query: string;
  onQueryChange: (value: string) => void;
  sort: MovieSort;
  onSortChange: (value: MovieSort) => void;
  onlyWatched: boolean;
  onOnlyWatchedChange: (value: boolean) => void;
  colors: {
    inputBg: string;
    inputBorder: string;
    textMain: string;
    textMuted: string;
    activeChipBg: string;
    inactiveChipBg: string;
  };
};

const SORT_OPTIONS: { value: MovieSort; label: string }[] = [
  { value: 'rating-desc', label: 'Рейтинг ↓' },
  { value: 'rating-asc', label: 'Рейтинг ↑' },
  { value: 'title-asc', label: 'Назва A-Z' },
  { value: 'title-desc', label: 'Назва Z-A' },
];

export function MovieFilters({
  query,
  onQueryChange,
  sort,
  onSortChange,
  onlyWatched,
  onOnlyWatchedChange,
  colors,
}: MovieFiltersProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.searchInput,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.textMain,
          },
        ]}
        value={query}
        onChangeText={onQueryChange}
        placeholder="Пошук фільму"
        placeholderTextColor={colors.textMuted}
      />

      <View style={styles.switchRow}>
        <Text style={[styles.switchText, { color: colors.textMain }]}>Тільки переглянуті</Text>
        <Switch value={onlyWatched} onValueChange={onOnlyWatchedChange} />
      </View>

      <View style={styles.chipsRow}>
        {SORT_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[
              styles.chip,
              { backgroundColor: sort === option.value ? colors.activeChipBg : colors.inactiveChipBg },
            ]}
            onPress={() => onSortChange(option.value)}>
            <Text style={[styles.chipText, { color: colors.textMain }]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
  },
  searchInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 15,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  switchText: {
    fontSize: 15,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
