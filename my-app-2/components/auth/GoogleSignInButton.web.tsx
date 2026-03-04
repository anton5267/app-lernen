import { CredentialResponse, GoogleLogin } from '@react-oauth/google';
import { StyleSheet, Text, View } from 'react-native';

type GoogleSignInButtonProps = {
  disabled: boolean;
  onToken: (idToken: string) => void;
  onError: (message: string) => void;
};

function onGoogleSuccess(
  response: CredentialResponse,
  onToken: (idToken: string) => void,
  onError: (message: string) => void
) {
  if (!response.credential) {
    onError('Google не повернув ID token.');
    return;
  }

  onToken(response.credential);
}

export function GoogleSignInButton({ disabled, onToken, onError }: GoogleSignInButtonProps) {
  if (disabled) {
    return (
      <View style={styles.disabledWrap}>
        <Text style={styles.disabledText}>Google вхід недоступний: не задано client id.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <GoogleLogin
        onSuccess={(response) => onGoogleSuccess(response, onToken, onError)}
        onError={() => onError('Не вдалося виконати вхід через Google.')}
        text="signin_with"
        shape="pill"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  disabledWrap: {
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#7f1d1d',
  },
  disabledText: {
    color: '#ffffff',
    fontWeight: '700',
    textAlign: 'center',
  },
});
