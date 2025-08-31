import { 
  EthClient, 
  EthUSDC, 
  OptimismCore, 
  OptimismUSDC, 
  ZoraUSDC, 
  ZoraClient, 
  WorldchainUSDC, 
  WorldchainClient, 
  BaseUSDC, 
  BaseClient, 
  InkUSDC, 
  InkClient, 
  UnichainUSDC, 
  UnichainClient, 
  PolygonUSDC, 
  PolygonClient 
} from "@/context/constants";
import {
  optimismSepolia,
  sepolia as ethSepolia,
  zoraSepolia,
  baseSepolia,
  polygonAmoy,
} from "wagmi/chains";
import { worldchainSepolia, inkSepolia, unichainSepolia } from "./chainConfig";

// Mapping between real blockchain chain IDs and LayerZero chain IDs
const REAL_TO_LAYERZERO_CHAIN_ID = {
  [optimismSepolia.id]: 420,     // 11155420 → 420
  [ethSepolia.id]: 111,          // 11155111 → 111
  [zoraSepolia.id]: 9999,        // 999999999 → 9999
  [modeSepolia.id]: 9998,        // 919 → 9998
} as const;

const LAYERZERO_TO_REAL_CHAIN_ID = {
  420: optimismSepolia.id,       // 420 → 11155420
  111: ethSepolia.id,            // 111 → 11155111
  9999: zoraSepolia.id,          // 9999 → 999999999
  9998: modeSepolia.id,          // 9998 → 919
} as const;

// Helper functions for chain ID conversion
export function realChainIdToLayerZero(realChainId: number): number | undefined {
  return REAL_TO_LAYERZERO_CHAIN_ID[realChainId as keyof typeof REAL_TO_LAYERZERO_CHAIN_ID];
}

export function layerZeroChainIdToReal(layerZeroChainId: number): number | undefined {
  return LAYERZERO_TO_REAL_CHAIN_ID[layerZeroChainId as keyof typeof LAYERZERO_TO_REAL_CHAIN_ID];
}

export function getUsdcAddress(chain: number | undefined): string {
  if (!chain) return OptimismUSDC;
  
  switch (chain) {
    case optimismSepolia.id:
      return OptimismUSDC;
    case ethSepolia.id:
      return EthUSDC;
    case zoraSepolia.id:
      return ZoraUSDC;
    default:
      return OptimismUSDC;
  }
}

export function getMidPayAddress(chain: number | undefined): string {
  if (!chain) return OptimismCore;
  
  switch (chain) {
    case optimismSepolia.id:
      return OptimismCore;
    case ethSepolia.id:
      return EthClient;
    case zoraSepolia.id:
      return ZoraClient;
    default:
      return OptimismCore;
  }
}