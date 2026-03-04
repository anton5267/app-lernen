import { StyleSheet, Text, View } from 'react-native';

import { ActionButton } from '@/components/common/ActionButton';

type AuthRequiredGateProps = {
  backgroundColor: string;
  titleColor: string;
  textColor: string;
  buttonColor: string;
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void;
};

export function AuthRequiredGate({
  backgroundColor,
  titleColor,
  textColor,
  buttonColor,
  title,
  description,
  buttonLabel,
  onPress,
}: AuthRequiredGateProps) {
  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      <Text style={[styles.text, { color: textColor }]}>{description}</Text>
      <ActionButton label={buttonLabel} backgroundColor={buttonColor} style={styles.button} onPress={onPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
    fontFamily: 'SpaceMono',
  },
  text: {
    fontSize: 16,
  },
  button: {
    marginTop: 14,
    alignSelf: 'flex-start',
  },
});
