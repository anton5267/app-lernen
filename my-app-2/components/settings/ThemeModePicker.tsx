import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { ThemePreference } from '@/context/AppContext';

type ThemeModePickerProps = {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
  textColor: string;
  activeBackground: string;
  inactiveBackground: string;
  borderColor: string;
};

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Система' },
  { value: 'light', label: 'Світла' },
  { value: 'warm', label: 'Тепла' },
  { value: 'dark', label: 'Темна' },
];

const THEME_ICONS: Record<ThemePreference, keyof typeof Ionicons.glyphMap> = {
  system: 'phone-portrait-outline',
  light: 'sunny-outline',
  warm: 'flame-outline',
  dark: 'moon-outline',
};

export function ThemeModePicker({
  value,
  onChange,
  textColor,
  activeBackground,
  inactiveBackground,
  borderColor,
}: ThemeModePickerProps) {
  const { width } = useWindowDimensions();
  const isNarrow = width < 430;

  return (
    <View style={styles.container} accessibilityRole="radiogroup" accessibilityLabel="Вибір теми застосунку">
      {OPTIONS.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            key={option.value}
            style={(state) => {
              const hovered = Boolean((state as { hovered?: boolean }).hovered);
              return [
                styles.button,
                isNarrow && styles.buttonNarrow,
                selected && styles.buttonSelected,
                hovered && !selected && styles.buttonHover,
                {
                  borderColor,
                  backgroundColor: selected ? activeBackground : inactiveBackground,
                  opacity: state.pressed ? 0.9 : 1,
                },
              ];
            }}
            accessibilityRole="radio"
            accessibilityLabel={`Тема: ${option.label}`}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}>
            <Ionicons name={THEME_ICONS[option.value]} size={14} color={textColor} />
            {selected ? <Ionicons name="checkmark-circle" size={14} color={textColor} /> : null}
            <Text style={[styles.text, { color: textColor }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flexGrow: 1,
    minWidth: 120,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonNarrow: {
    width: '100%',
    minWidth: 0,
  },
  buttonSelected: {
    borderWidth: 2,
  },
  buttonHover: {
    transform: [{ translateY: -1 }],
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
