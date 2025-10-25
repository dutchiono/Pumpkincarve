'use client';

import { AuthKitProvider, SignInButton } from '@farcaster/auth-kit';
import '@farcaster/auth-kit/styles.css';

const config = {
  domain: 'localhost',
  uri: 'http://localhost:3000',
  relay: 'https://relay.farcaster.xyz',
  version: 'v1',
};

interface FarcasterSignInProps {
  onSuccess?: () => void;
}

function SignInButtonWithCallback({ onSuccess }: FarcasterSignInProps) {
  return (
    <SignInButton
      onSuccess={({ message }) => {
        console.log('Signed in!', message);
        if (onSuccess) {
          onSuccess();
        }
      }}
    />
  );
}

export function FarcasterSignIn({ onSuccess }: FarcasterSignInProps) {
  return (
    <AuthKitProvider config={config}>
      <SignInButtonWithCallback onSuccess={onSuccess} />
    </AuthKitProvider>
  );
}
