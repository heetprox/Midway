'use client';

import { useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useChainId,
  useSwitchChain
} from "wagmi";
import { Address } from "viem";
import { optimismSepolia, sepolia as ethSepolia, zoraSepolia, modeTestnet as modeSepolia } from "wagmi/chains";
import MidPayCore from "../abi/MidPayCore.json";
import fakeUSDC from "../abi/FakeUSDC.json";
import { toFixed } from "../utils/bigIntHelpers";
import { getUsdcAddress } from "../utils/addressHelpers";
import { OptimismCore } from "@/context/constants";

// Define supported chains using real blockchain chain IDs
const SUPPORTED_CHAINS = [optimismSepolia, ethSepolia, zoraSepolia, modeSepolia] as const;
const DEFAULT_CHAIN = optimismSepolia;

export default function BalanceDialog() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Force connection to Optimism Sepolia if not connected to a supported chain
  useEffect(() => {
    if (chainId && !SUPPORTED_CHAINS.some(chain => chain.id === chainId)) {
      switchChain?.({ chainId: DEFAULT_CHAIN.id });
    }
  }, [chainId, switchChain]);

  // Read MidPay balance from core contract on Optimism Sepolia
  const {
    data: MidPayCoreBalance,
    isLoading: isMidPayCoreBalanceLoading,
    error: coreBalanceError,
  } = useReadContract({
    address: OptimismCore as Address,
    abi: MidPayCore.abi,
    chainId: optimismSepolia.id,
    functionName: "balances",
    args: [address as Address],
    query: {
      enabled: !!address,
      refetchInterval: 30000,
    },
  });

  // Read wallet USDC balance from current chain
  const {
    data: walletBalance,
    isLoading: isWalletBalanceLoading,
    error: walletBalanceError,
  } = useReadContract({
    address: getUsdcAddress(chainId) as Address,
    abi: fakeUSDC.abi,
    chainId: chainId,
    functionName: "balanceOf",
    args: [address as Address],
    query: {
      enabled: !!address && !!chainId && !!getUsdcAddress(chainId),
      refetchInterval: 30000,
    },
  });

  // Get current chain name for display
  const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId);
  const chainName = currentChain?.name || 'Unknown Chain';

  return (
    <div className="w-full flex flex-col gap-6 s-font h-full  rounded-2xl"
      style={{
        // padding: "clamp(1.25rem, 1vw, 200rem)"
      }}
    >
      <div className="flex gap-4">
        <div className="text-black w-fit text-xl leading-none border-2 border-black rounded-full"
          style={{
            padding: "clamp(1rem, 1vw, 200rem)",
            boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)" // right + bottom only
          }}
        >
          Your Wallet
        </div>
        <div className="text-black w-fit text-xl leading-none border-2 border-black rounded-full"
          style={{
            padding: "clamp(1rem, 1vw, 200rem)",
            boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)" // right + bottom only
          }}
        >
          [address] : {address}
        </div>

      </div>


      <div className="flex gap-2 border-4 border-black flex-col w-full"
        style={{
          padding: "clamp(1rem, 1vw, 200rem)",
          boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)" // right + bottom only
        }}
      >
        <div className="b-font text-3xl">CORE BALANCE</div>

        {isMidPayCoreBalanceLoading ? (
          <div className="b-font text-3xl ">🡢 Loading...</div>
        )
          :
          coreBalanceError ? (
            <div className="s-font text-3xl ">🡢 Error</div>
          )
            :
            (
              <div className="s-font text-3xl ">🡢 {toFixed(MidPayCoreBalance as bigint)} USDC</div>
            )
        }

      </div>

      <div className="flex gap-2 border-4 border-black flex-col w-full"
        style={{
          padding: "clamp(1rem, 1vw, 200rem)",
          boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)" // right + bottom only
        }}
      >
        <div className="b-font text-3xl">MINTED USDC</div>

        {isWalletBalanceLoading ? (<div className="s-font text-3xl ">🡢 Loading...</div>) : walletBalanceError ? (<div className="s-font text-3xl ">🡢 Error</div>) : (<div className="s-font text-3xl ">🡢 {toFixed(walletBalance as bigint)} USDC</div>)}

      </div>



    </div>
  );
}