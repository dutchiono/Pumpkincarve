import { farcasterMiniApp as miniAppConnector } from '@farcaster/miniapp-wagmi-connector';
import { createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';

const farcasterConnector = miniAppConnector();

export const config = createConfig({
  chains: [base, baseSepolia], // Base mainnet AND Base Sepolia testnet
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
  connectors: [farcasterConnector],
  ssr: false, // Disable SSR to prevent hydration issues
});

