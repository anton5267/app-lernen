import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

type ScrollTopFabProps = {
  visible: boolean;
  onPress: () => void;
  backgroundColor: string;
  bottom?: number;
  right?: number;
  label?: string;
};

export function ScrollTopFab({
  visible,
  onPress,
  backgroundColor,
  bottom = 84,
  right = 16,
  label = 'Вгору',
}: ScrollTopFabProps) {
  if (!visible) {
    return null;
  }

  return (
    <Pressable style={[styles.button, { backgroundColor, bottom, right }]} onPress={onPress}>
      <Ionicons name="arrow-up-outline" size={16} color="#ffffff" />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
});

