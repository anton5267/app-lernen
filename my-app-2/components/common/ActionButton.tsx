import { Ionicons } from '@expo/vector-icons';
import { StyleProp, StyleSheet, Text, TextStyle, ViewStyle, Pressable } from 'react-native';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  backgroundColor: string;
  textColor?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function ActionButton({
  label,
  onPress,
  backgroundColor,
  textColor = '#ffffff',
  iconName,
  iconSize = 14,
  disabled = false,
  compact = false,
  style,
  textStyle,
}: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={(state) => {
        const hovered = Boolean((state as { hovered?: boolean }).hovered);
        return [
          styles.button,
          compact && styles.compact,
          hovered && !disabled && styles.buttonHover,
          {
            backgroundColor,
            opacity: disabled ? 0.55 : state.pressed ? 0.88 : 1,
          },
          style,
        ];
      }}>
      {iconName ? <Ionicons name={iconName} size={iconSize} color={textColor} /> : null}
      <Text style={[styles.buttonText, { color: textColor }, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  compact: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 9,
  },
  buttonHover: {
    transform: [{ translateY: -1 }],
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
