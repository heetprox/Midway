import { createPublicClient, http } from "viem";
import { createConfig } from "wagmi";
import {
  optimismSepolia,
  sepolia as ethSepolia,
  zoraSepolia,
  baseSepolia,
  polygonAmoy,
  worldchainSepolia,
  inkSepolia,
  unichainSepolia,
} from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";


const chains = [
  optimismSepolia, 
  ethSepolia, 
  zoraSepolia, 
  baseSepolia, 
  polygonAmoy,
  worldchainSepolia, 
  inkSepolia, 
  unichainSepolia, 
] as const;

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
    [zoraSepolia.id]: http(),
    [baseSepolia.id]: http(),
    [polygonAmoy.id]: http(),
    [worldchainSepolia.id]: http(),
    [inkSepolia.id]: http(),
    [unichainSepolia.id]: http(),
  },
});