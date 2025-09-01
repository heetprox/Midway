'use client';

import {
  useAccount,
  useReadContract,
  useChainId,
} from "wagmi";
import { Address } from "viem";
import { optimismSepolia } from "wagmi/chains";
import MidPayCore from "../abi/MidPayCore.json";
import fakeUSDC from "../abi/FakeUSDC.json";
import { toFixed } from "../utils/bigIntHelpers";
import { getUsdcAddress } from "../utils/addressHelpers";
import { OptimismCore } from "@/context/constants";


export default function BalanceDialog() {
  const { address } = useAccount();
  const chainId = useChainId();

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

  return (
    <div className="w-full flex flex-col gap-4 sm:gap-6 s-font h-full rounded-2xl">
      <div className="flex  sm:flex-row gap-2 sm:gap-4">
        <div className="text-black w-fit leading-none border-2 border-black rounded-full"
          style={{
            padding: "clamp(0.5rem, 1vw, 1rem)",
            boxShadow: "clamp(5px, 1vw, 10px) clamp(5px, 1vw, 10px) 1px rgba(0, 0, 0, 1)",
            fontSize: "clamp(1rem, 2.5vw, 1.25rem)"
          }}
        >
          Your Wallet
        </div>
        <div className="text-black w-fit leading-none border-2 border-black rounded-full"
          style={{
            padding: "clamp(0.5rem, 1vw, 1rem)",
            boxShadow: "clamp(5px, 1vw, 10px) clamp(5px, 1vw, 10px) 1px rgba(0, 0, 0, 1)",
            fontSize: "clamp(1rem, 2vw, 1.25rem)"
          }}
        >
          [address] : {address?.slice(0, 6) + "..." + address?.slice(-4)}
        </div>
      </div>


      <div className="flex gap-2 border-2 border-black flex-col w-full"
        style={{
          padding: "clamp(0.75rem, 1vw, 1.5rem)",
          boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)"
        }}
      >
        <div className="b-font" style={{ fontSize: "clamp(1.5rem, 4vw, 3rem)" }}>
          CORE BALANCE
        </div>

        {isMidPayCoreBalanceLoading ? (
          <div className="b-font" style={{ fontSize: "clamp(1.25rem, 3.5vw, 3rem)" }}>
            🡢 Loading...
          </div>
        ) : coreBalanceError ? (
          <div className="s-font" style={{ fontSize: "clamp(1.25rem, 3.5vw, 3rem)" }}>
            🡢 Error
          </div>
        ) : (
          <div className="s-font" style={{ fontSize: "clamp(1.25rem, 3.5vw, 3rem)" }}>
            🡢 {toFixed(MidPayCoreBalance as bigint)} FUSD
          </div>
        )}
      </div>

      <div className="flex gap-2 border-2 border-black flex-col w-full"
        style={{
          padding: "clamp(0.75rem, 1vw, 1.5rem)",
            boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)"
        }}
      >
        <div className="b-font" style={{ fontSize: "clamp(1.5rem, 4vw, 3rem)" }}>
          MINTED FUSD
        </div>

        {isWalletBalanceLoading ? (
          <div className="s-font" style={{ fontSize: "clamp(1.25rem, 3.5vw, 3rem)" }}>
            🡢 Loading...
          </div>
        ) : walletBalanceError ? (
          <div className="s-font" style={{ fontSize: "clamp(1.25rem, 3.5vw, 3rem)" }}>
            🡢 Error
          </div>
        ) : (
          <div className="s-font" style={{ fontSize: "clamp(1.25rem, 3.5vw, 3rem)" }}>
            🡢 {toFixed(walletBalance as bigint)} FUSD
          </div>
        )}
      </div>



    </div>
  );
}