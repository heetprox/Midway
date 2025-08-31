import { createPublicClient, http } from "viem";
import { createConfig } from "wagmi";
import {
  optimismSepolia,
  sepolia as ethSepolia,
  zoraSepolia,
  baseSepolia,
  polygonAmoy,
} from "wagmi/chains";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";

// Define custom chains that aren't available in wagmi/chains
export const worldchainSepolia = defineChain({
  id: 4801,
  name: 'Worldchain Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://worldchain-sepolia.g.alchemy.com/public'] },
  },
  blockExplorers: {
    default: { name: 'Worldchain Explorer', url: 'https://worldchain-sepolia.blockscout.com' },
  },
  testnet: true,
});

export const inkSepolia = defineChain({
  id: 763373,
  name: 'Ink Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc-gel-sepolia.inkonchain.com'] },
  },
  blockExplorers: {
    default: { name: 'Ink Explorer', url: 'https://explorer-sepolia.inkonchain.com' },
  },
  testnet: true,
});

export const unichainSepolia = defineChain({
  id: 1301,
  name: 'Unichain Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia.unichain.org'] },
  },
  blockExplorers: {
    default: { name: 'Unichain Explorer', url: 'https://sepolia.uniscan.xyz' },
  },
  testnet: true,
});

// Define chains with real blockchain chain IDs for proper network switching
const chains = [
  optimismSepolia, 
  ethSepolia, 
  zoraSepolia, 
  baseSepolia, 
  worldchainSepolia, 
  inkSepolia, 
  unichainSepolia, 
  polygonAmoy
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
    [worldchainSepolia.id]: http(),
    [inkSepolia.id]: http(),
    [unichainSepolia.id]: http(),
    [polygonAmoy.id]: http(),
  },
});