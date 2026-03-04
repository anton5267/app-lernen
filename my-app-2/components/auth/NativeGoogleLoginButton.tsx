import * as Google from 'expo-auth-session/providers/google';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { authRedirectUri, effectiveWebClientId, googleClientId } from '@/services/authConfig';

type NativeGoogleLoginButtonProps = {
  authLoading: boolean;
  onToken: (idToken: string) => void;
  onErrorMessage: (message: string) => void;
  buttonColor: string;
};

export function NativeGoogleLoginButton({
  authLoading,
  onToken,
  onErrorMessage,
  buttonColor,
}: NativeGoogleLoginButtonProps) {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: effectiveWebClientId,
    redirectUri: authRedirectUri,
  });

  useEffect(() => {
    if (response?.type !== 'success') {
      return;
    }

    const idToken = (response.params as { id_token?: string } | undefined)?.id_token;
    if (!idToken) {
      onErrorMessage('Google не повернув ID token.');
      return;
    }

    onToken(idToken);
  }, [onErrorMessage, onToken, response]);

  return (
    <Pressable
      style={[styles.button, { backgroundColor: buttonColor }]}
      disabled={!request || authLoading || !googleClientId}
      onPress={() => {
        if (!googleClientId) {
          onErrorMessage('Не задано EXPO_PUBLIC_GOOGLE_CLIENT_ID у my-app-2/.env');
          return;
        }

        promptAsync();
      }}>
      <Text style={styles.buttonText}>{authLoading ? 'Вхід...' : 'Увійти через Google'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
});
