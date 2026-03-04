import * as AuthSession from 'expo-auth-session';
import { Platform } from 'react-native';

export const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
export const effectiveWebClientId = googleClientId || 'missing-web-client-id';

export const authRedirectUri =
  Platform.OS === 'web'
    ? typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:19007'
    : AuthSession.makeRedirectUri({
        scheme: 'myapp2',
      });
