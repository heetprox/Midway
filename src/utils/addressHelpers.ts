import { EthUSDC, ModeUSDC, OptimismUSDC, ZoraUSDC } from "@/context/constants";
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
      case optimismGoerli.id:
        return contracts.OmniPayCore;
      case baseGoerli.id:
        return contracts.BaseOmniPayClient;
      case zoraTestnet.id:
        return contracts.ZoraOmniPayClient;
      case modeTestnet.id:
        return contracts.ModeOmniPayClient;
      default:
        return contracts.OmniPayCore;
    }
  }