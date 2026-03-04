import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

type ScreenPanelProps = PropsWithChildren<{
  backgroundColor: string;
  borderColor: string;
  style?: StyleProp<ViewStyle>;
}>;

export function ScreenPanel({ backgroundColor, borderColor, style, children }: ScreenPanelProps) {
  return <View style={[styles.panel, { backgroundColor, borderColor }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
});
