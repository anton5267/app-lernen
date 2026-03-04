import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

export type StatusBannerState = {
  type: 'error' | 'success' | 'info';
  message: string;
} | null;

type StatusBannerProps = {
  banner: StatusBannerState;
  errorColor: string;
  successColor: string;
  infoColor: string;
  autoHideMs?: number;
  dismissible?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

function withAlpha(color: string, alphaHex: string) {
  const value = color.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) {
    return `${value}${alphaHex}`;
  }
  if (/^#[0-9a-fA-F]{3}$/.test(value)) {
    const r = value[1];
    const g = value[2];
    const b = value[3];
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`;
  }
  return 'rgba(15, 23, 42, 0.58)';
}

export function StatusBanner({
  banner,
  errorColor,
  successColor,
  infoColor,
  autoHideMs = 5200,
  dismissible = true,
  containerStyle,
  textStyle,
}: StatusBannerProps) {
  const [visibleBanner, setVisibleBanner] = useState<StatusBannerState>(banner);

  useEffect(() => {
    setVisibleBanner(banner);
  }, [banner]);

  useEffect(() => {
    if (!visibleBanner || autoHideMs <= 0) {
      return;
    }

    const timer = setTimeout(() => {
      setVisibleBanner(null);
    }, autoHideMs);
    return () => clearTimeout(timer);
  }, [autoHideMs, visibleBanner]);

  if (!visibleBanner) {
    return null;
  }

  const color =
    visibleBanner.type === 'error' ? errorColor : visibleBanner.type === 'success' ? successColor : infoColor;
  const iconName: keyof typeof Ionicons.glyphMap =
    visibleBanner.type === 'error'
      ? 'alert-circle-outline'
      : visibleBanner.type === 'success'
        ? 'checkmark-circle-outline'
        : 'information-circle-outline';
  const backgroundColor = withAlpha(color, '24');
  const iconColor = withAlpha(color, 'ff');

  return (
    <View style={[styles.container, { borderColor: color, backgroundColor }, containerStyle]}>
      <Ionicons name={iconName} size={16} color={iconColor} />
      <Text style={[styles.text, textStyle, { color }]}>{visibleBanner.message}</Text>
      {dismissible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрити повідомлення"
          style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
          onPress={() => setVisibleBanner(null)}>
          <Ionicons name="close" size={14} color={iconColor} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  closeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonPressed: {
    opacity: 0.75,
  },
});
