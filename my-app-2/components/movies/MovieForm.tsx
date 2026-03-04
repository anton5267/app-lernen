import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { MovieDraft } from '@/types/movie';

type MovieFormProps = {
  draft: MovieDraft;
  editing: boolean;
  onChange: (draft: MovieDraft) => void;
  onSubmit: () => void;
  onCancelEdit: () => void;
  colors: {
    inputBg: string;
    inputBorder: string;
    textMain: string;
    textMuted: string;
    cardBg: string;
    primaryButtonBg: string;
    primaryButtonText: string;
    secondaryButtonBg: string;
    secondaryButtonText: string;
  };
};

export function MovieForm({ draft, editing, onChange, onSubmit, onCancelEdit, colors }: MovieFormProps) {
  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.inputBorder }]}>
      <Text style={[styles.title, { color: colors.textMain }]}>{editing ? 'Редагувати фільм' : 'Додати фільм'}</Text>

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.textMain,
          },
        ]}
        value={draft.title}
        onChangeText={(value) => onChange({ ...draft, title: value })}
        placeholder="Назва"
        placeholderTextColor={colors.textMuted}
      />

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.textMain,
          },
        ]}
        value={draft.rating}
        onChangeText={(value) => onChange({ ...draft, rating: value })}
        placeholder="Рейтинг (0-10)"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
      />

      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputBg,
            borderColor: colors.inputBorder,
            color: colors.textMain,
          },
        ]}
        value={draft.image}
        onChangeText={(value) => onChange({ ...draft, image: value })}
        placeholder="URL постера (опційно)"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      <View style={styles.actions}>
        <Pressable style={[styles.primaryButton, { backgroundColor: colors.primaryButtonBg }]} onPress={onSubmit}>
          <Text style={[styles.primaryButtonText, { color: colors.primaryButtonText }]}>
            {editing ? 'Зберегти' : 'Додати'}
          </Text>
        </Pressable>

        {editing ? (
          <Pressable
            style={[styles.secondaryButton, { backgroundColor: colors.secondaryButtonBg }]}
            onPress={onCancelEdit}>
            <Text style={[styles.secondaryButtonText, { color: colors.secondaryButtonText }]}>Скасувати</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontSize: 15,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
