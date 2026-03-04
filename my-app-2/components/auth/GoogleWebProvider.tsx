import { ReactNode } from 'react';

type GoogleWebProviderProps = {
  clientId: string;
  children: ReactNode;
};

export function GoogleWebProvider({ children }: GoogleWebProviderProps) {
  return <>{children}</>;
}
