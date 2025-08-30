import { createPublicClient, http } from "viem";
import { createConfig } from "wagmi";
import {
  optimismSepolia,
  sepolia as ethSepolia,
  modeTestnet as modeSepolia,
  zoraSepolia,
} from "wagmi/chains";
import { injected } from "wagmi/connectors";

// Custom chain definitions that match your LayerZero setup
const customZoraSepolia = {
  ...zoraSepolia,
  id: 9999, // Use LayerZero chain ID instead of real chain ID
} as const;

const customModeSepolia = {
  ...modeSepolia,
  id: 9998, // Use LayerZero chain ID instead of real chain ID
} as const;

const customOptimismSepolia = {
  ...optimismSepolia,
  id: 420, // Use LayerZero chain ID instead of real chain ID
} as const;

const customEthSepolia = {
  ...ethSepolia,
  id: 111, // Use LayerZero chain ID instead of real chain ID
} as const;

// Define chains using LayerZero chain IDs for consistency
const chains = [customOptimismSepolia, customEthSepolia, customModeSepolia, customZoraSepolia] as const;

// Create public client for Optimism Sepolia
export const publicClient = createPublicClient({
  chain: customOptimismSepolia,
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
    [customOptimismSepolia.id]: http(),
    [customEthSepolia.id]: http(),
    [customModeSepolia.id]: http(),
    [customZoraSepolia.id]: http(),
  },
});