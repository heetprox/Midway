import { EthClient, EthUSDC, ModeUSDC, OptimismCore, OptimismUSDC, ZoraUSDC, ModeClient, ZoraClient } from "@/context/constants";
import {
    optimismSepolia,
    sepolia as ethSepolia,
    modeTestnet as modeSepolia,
    zoraSepolia,
    baseGoerli,
  } from "wagmi/chains";


  export function getUsdcAddress(chain: number | undefined): string {
    switch (chain) {
      case optimismSepolia.id:
        return OptimismUSDC;
      case ethSepolia.id:
        return EthUSDC;
      case zoraSepolia.id:
        return ZoraUSDC;
      case modeSepolia.id:
        return ModeUSDC;
      default:
        return OptimismUSDC;
    }
  }
  
  export function getOmniPayAddress(chain: number | undefined): string {
    switch (chain) {
      case optimismSepolia.id:
        return OptimismCore;
      case ethSepolia.id:
        return EthClient;
      case zoraSepolia.id:
        return ZoraClient;
      case modeSepolia.id:
        return ModeClient;
      default:
        return OptimismCore;
    }
  }