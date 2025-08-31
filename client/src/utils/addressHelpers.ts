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

// Mapping between real blockchain chain IDs and ExternalRouter chain IDs
const REAL_TO_EXTERNAL_ROUTER_CHAIN_ID = {
  [optimismSepolia.id]: 420,        // 11155420 → 420
  [ethSepolia.id]: 111,             // 11155111 → 111
  [zoraSepolia.id]: 9999,           // 999999999 → 9999
  [worldchainSepolia.id]: 480,      // 4801 → 480
  [baseSepolia.id]: 845,            // 84532 → 845
  [inkSepolia.id]: 763,             // 763373 → 763
  [unichainSepolia.id]: 130,        // 1301 → 130
  [polygonAmoy.id]: 800,            // 80002 → 800
} as const;

const EXTERNAL_ROUTER_TO_REAL_CHAIN_ID = {
  420: optimismSepolia.id,          // 420 → 11155420
  111: ethSepolia.id,               // 111 → 11155111
  9999: zoraSepolia.id,             // 9999 → 999999999
  480: worldchainSepolia.id,        // 480 → 4801
  845: baseSepolia.id,              // 845 → 84532
  763: inkSepolia.id,               // 763 → 763373
  130: unichainSepolia.id,          // 130 → 1301
  800: polygonAmoy.id,              // 800 → 80002
} as const;

// Helper functions for chain ID conversion
export function realChainIdToExternalRouter(realChainId: number): number | undefined {
  return REAL_TO_EXTERNAL_ROUTER_CHAIN_ID[realChainId as keyof typeof REAL_TO_EXTERNAL_ROUTER_CHAIN_ID];
}

export function externalRouterChainIdToReal(externalRouterChainId: number): number | undefined {
  return EXTERNAL_ROUTER_TO_REAL_CHAIN_ID[externalRouterChainId as keyof typeof EXTERNAL_ROUTER_TO_REAL_CHAIN_ID];
}

// Legacy function names for backward compatibility
export function realChainIdToLayerZero(realChainId: number): number | undefined {
  return realChainIdToExternalRouter(realChainId);
}

export function layerZeroChainIdToReal(layerZeroChainId: number): number | undefined {
  return externalRouterChainIdToReal(layerZeroChainId);
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
    case worldchainSepolia.id:
      return WorldchainUSDC;
    case baseSepolia.id:
      return BaseUSDC;
    case inkSepolia.id:
      return InkUSDC;
    case unichainSepolia.id:
      return UnichainUSDC;
    case polygonAmoy.id:
      return PolygonUSDC;
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
    case worldchainSepolia.id:
      return WorldchainClient;
    case baseSepolia.id:
      return BaseClient;
    case inkSepolia.id:
      return InkClient;
    case unichainSepolia.id:
      return UnichainClient;
    case polygonAmoy.id:
      return PolygonClient;
    default:
      return OptimismCore;
  }
}