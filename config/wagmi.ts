import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';
import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';

const farcasterConnector = miniAppConnector();

export const config = createConfig({
  chains: [baseSepolia, base],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [base.id]: http('https://mainnet.base.org'),
  },
  connectors: [farcasterConnector],
  ssr: false, // Disable SSR to prevent hydration issues
});

