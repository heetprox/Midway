'use client';

import { useEffect } from "react";
import { 
  useAccount, 
  useReadContract, 
  useChainId,
  useSwitchChain 
} from "wagmi";
import { Address } from "viem";
import { optimismSepolia, sepolia as ethSepolia, zoraSepolia , modeTestnet as modeSepolia } from "wagmi/chains";
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
    <div className=" backdrop-blur-lg rounded-3xl  p-8 w-full border border-[#181917]/5  transition-all duration-500 group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-[#181917]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      
      <div className="relative z-10">
        {/* MidPay Balance Section */}
        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#181917] to-[#181917]/80 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-[#FEFBEC] rounded-full"></div>
              </div>
              <h2 className="b-font text-2xl text-[#181917]">MidPay Balance</h2>
            </div>
          </div>
          
          <div className="text-center relative">
            {isMidPayCoreBalanceLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-[#181917]/20 border-t-[#181917] rounded-full animate-spin"></div>
                <span className="text-2xl text-[#181917]/60 s-font">Loading...</span>
              </div>
            ) : coreBalanceError ? (
              <div className="text-red-500">
                <div className="text-2xl font-bold mb-2">Error</div>
                <div className="text-sm s-font bg-red-50 p-3 rounded-xl">
                  Unable to load MidPay balance
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-[#181917] font-mono">
                    {toFixed(MidPayCoreBalance as bigint)}
                  </span>
                  <span className="text-xl text-[#181917]/70 b-font">USDC</span>
                </div>
                <div className="h-1 w-24 bg-gradient-to-r from-transparent via-[#181917]/30 to-transparent mx-auto rounded-full"></div>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-[#181917]/10 my-8"></div>

        {/* Wallet Balance Section */}
        <div className="mb-6">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#181917]/80 to-[#181917]/60 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-[#FEFBEC] rounded-full opacity-80"></div>
              </div>
              <h2 className="b-font text-2xl text-[#181917]">Wallet Balance</h2>
            </div>
          </div>
          
          {/* Chain Name Badge */}
          <div className="flex justify-center mb-4">
            <div className="bg-[#181917]/10 backdrop-blur-sm px-4 py-2 rounded-full border border-[#181917]/20">
              <span className="text-sm text-[#181917]/70 s-font">{chainName}</span>
            </div>
          </div>
          
          <div className="text-center relative">
            {isWalletBalanceLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-6 h-6 border-2 border-[#181917]/20 border-t-[#181917] rounded-full animate-spin"></div>
                <span className="text-2xl text-[#181917]/60 s-font">Loading...</span>
              </div>
            ) : walletBalanceError ? (
              <div className="text-red-500">
                <div className="text-2xl font-bold mb-2">Error</div>
                <div className="text-sm s-font bg-red-50 p-3 rounded-xl space-y-1">
                  <div>Unable to load wallet balance</div>
                  {!getUsdcAddress(chainId) && (
                    <div className="text-xs">USDC not supported on this chain</div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold text-[#181917] font-mono">
                    {toFixed(walletBalance as bigint)}
                  </span>
                  <span className="text-xl text-[#181917]/70 b-font">USDC</span>
                </div>
                <div className="h-1 w-24 bg-gradient-to-r from-transparent via-[#181917]/30 to-transparent mx-auto rounded-full"></div>
              </div>
            )}
          </div>

          {/* Chain switching hint */}
          {chainId && !SUPPORTED_CHAINS.some(chain => chain.id === chainId) && (
            <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <div className="text-orange-600 text-sm text-center s-font">
                Please switch to a supported network to view wallet balance
              </div>
            </div>
          )}
        </div>

        {/* Connection status */}
        {!address && (
          <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-xl">
            <div className="text-orange-600 text-sm text-center s-font">
              Please connect your wallet to view balances
            </div>
          </div>
        )}

        {/* Auto-refresh indicator */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <div className="text-xs text-[#181917]/50 s-font">
            Auto-refreshes every 30 seconds
          </div>
        </div>
      </div>
    </div>
  );
}