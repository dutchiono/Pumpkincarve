import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';
import { createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';

const farcasterConnector = miniAppConnector();

export const config = createConfig({
  chains: [base], // Base mainnet only
  transports: {
    [base.id]: http('https://mainnet.base.org'),
  },
  connectors: [farcasterConnector],
  ssr: false, // Disable SSR to prevent hydration issues
});

