import { EthClient, EthUSDC, ModeUSDC, OptimismCore, OptimismUSDC, ZoraUSDC, ModeClient, ZoraClient } from "@/context/constants";

// LayerZero chain IDs that match your backend configuration
const LAYER_ZERO_CHAIN_IDS = {
  OPTIMISM_SEPOLIA: 420,
  ETH_SEPOLIA: 111,
  ZORA_SEPOLIA: 9999,
  MODE_SEPOLIA: 9998,
} as const;

export function getUsdcAddress(chain: number | undefined): string {
  switch (chain) {
    case LAYER_ZERO_CHAIN_IDS.OPTIMISM_SEPOLIA:
      return OptimismUSDC;
    case LAYER_ZERO_CHAIN_IDS.ETH_SEPOLIA:
      return EthUSDC;
    case LAYER_ZERO_CHAIN_IDS.ZORA_SEPOLIA:
      return ZoraUSDC;
    case LAYER_ZERO_CHAIN_IDS.MODE_SEPOLIA:
      return ModeUSDC;
    default:
      return OptimismUSDC;
  }
}

export function getMidPayAddress(chain: number | undefined): string {
  switch (chain) {
    case LAYER_ZERO_CHAIN_IDS.OPTIMISM_SEPOLIA:
      return OptimismCore;
    case LAYER_ZERO_CHAIN_IDS.ETH_SEPOLIA:
      return EthClient;
    case LAYER_ZERO_CHAIN_IDS.ZORA_SEPOLIA:
      return ZoraClient;
    case LAYER_ZERO_CHAIN_IDS.MODE_SEPOLIA:
      return ModeClient;
    default:
      return OptimismCore;
  }
}