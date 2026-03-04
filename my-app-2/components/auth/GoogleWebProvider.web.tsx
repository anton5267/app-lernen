import { GoogleOAuthProvider } from '@react-oauth/google';
import { ReactNode } from 'react';

type GoogleWebProviderProps = {
  clientId: string;
  children: ReactNode;
};

export function GoogleWebProvider({ clientId, children }: GoogleWebProviderProps) {
  if (!clientId) {
    return <>{children}</>;
  }

  return <GoogleOAuthProvider clientId={clientId}>{children}</GoogleOAuthProvider>;
}
