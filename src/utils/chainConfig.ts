import { createPublicClient, http } from "viem";
import { createConfig } from "wagmi";
import {
  optimismSepolia,
  sepolia as ethSepolia,
  modeTestnet as modeSepolia,
  zoraSepolia,
} from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Define chains with optimismSepolia as the first/default chain
const chains = [optimismSepolia, ethSepolia, modeSepolia, zoraSepolia] as const;

// Create public client for Optimism Sepolia
export const publicClient = createPublicClient({
  chain: optimismSepolia,
  transport: http(),
});

// Create wagmi config using the new v2 API with modern wallet detection
export const config = createConfig({
  chains,
  connectors: [
    injected({
      target: () => {
        // Only use window.ethereum, never window.web3
        return typeof window !== 'undefined' && window.ethereum 
          ? {
              id: 'injected',
              name: 'Injected Wallet',
              provider: window.ethereum,
            }
          : undefined;
      },
      shimDisconnect: false,
    }),
  ],
  transports: {
    [optimismSepolia.id]: http(),
    [ethSepolia.id]: http(),
    [modeSepolia.id]: http(),
    [zoraSepolia.id]: http(),
  },
});