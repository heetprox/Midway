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
  // Note: Must use REAL blockchain chain ID for wagmi contract reads
  const {
    data: MidPayCoreBalance,
    isLoading: isMidPayCoreBalanceLoading,
    error: coreBalanceError,
  } = useReadContract({
    address: OptimismCore as Address,
    abi: MidPayCore.abi,
    chainId: optimismSepolia.id, // Use REAL Optimism Sepolia chain ID (11155420)
    functionName: "balances",
    args: [address as Address],
    query: {
      enabled: !!address,
      refetchInterval: 30000, // Refresh every 30 seconds
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
      refetchInterval: 30000, // Refresh every 30 seconds
    },
  });

  // Get current chain name for display
  const currentChain = SUPPORTED_CHAINS.find(chain => chain.id === chainId);
  const chainName = currentChain?.name || 'Unknown Chain';

  return (
    <div className="bg-white rounded-lg shadow-xl p-6 w-96">
      {/* MidPay Balance Section */}
      <div className="mb-6">
        <h2 className="b-font text-xl text-[#181917] mb-4">Your MidPay Balance</h2>
        <p className="flex justify-center align-middle gap-1">
          <span className="text-3xl font-bold inline-flex items-center">
            {isMidPayCoreBalanceLoading
              ? "Loading..."
              : coreBalanceError
              ? "Error"
              : toFixed(MidPayCoreBalance as bigint)}
          </span>
          <span className="inline-flex items-center">USDC</span>
        </p>
        
        {/* Error message for core balance */}
        {coreBalanceError && (
          <div className="text-red-600 text-sm text-center mt-2 s-font">
            Unable to load MidPay balance
          </div>
        )}
      </div>

      <div className="border-t border-[#181917]/20 my-6"></div>

      {/* Wallet Balance Section */}
      <div className="mb-6">
        <h2 className="b-font text-xl text-[#181917] mb-4">
          Your Wallet Balance
          <span className="text-sm font-normal text-gray-500 s-font">
            ({chainName})
          </span>
        </h2>
        <p className="flex justify-center align-middle gap-1">
          <span className="text-3xl font-bold inline-flex items-center">
            {isWalletBalanceLoading
              ? "Loading..."
              : walletBalanceError
              ? "Error"
              : toFixed(walletBalance as bigint)}
          </span>
          <span className="inline-flex items-center">USDC</span>
        </p>

        {/* Error message for wallet balance */}
        {walletBalanceError && (
          <div className="text-red-600 text-sm text-center mt-2 s-font">
            Unable to load wallet balance
            {!getUsdcAddress(chainId) && (
              <div className="text-xs mt-1">
                USDC not supported on this chain
              </div>
            )}
          </div>
        )}

        {/* Chain switching hint */}
        {chainId && !SUPPORTED_CHAINS.some(chain => chain.id === chainId) && (
          <div className="text-orange-600 text-sm text-center mt-2 s-font">
            Please switch to a supported network
          </div>
        )}
      </div>

      {/* Connection status */}
      {!address && (
        <div className="pt-0">
          <div className="text-orange-600 text-sm text-center s-font">
            Please connect your wallet to view balances
          </div>
        </div>
      )}

      {/* Refresh indicator */}
      <div className="text-xs text-gray-400 text-center mt-4 s-font">
        Balances update every 30 seconds
      </div>
    </div>
  );
}