'use client';

import { useEffect } from "react";
import { 
  useAccount, 
  useReadContract, 
  useChainId,
  useSwitchChain 
} from "wagmi";
import { Address } from "viem";
import { optimismSepolia, sepolia, zoraSepolia } from "wagmi/chains";
import MidPayCore from "../abi/MidPayCore.json";
import fakeUSDC from "../abi/FakeUSDC.json";
import { toFixed } from "../utils/bigIntHelpers";
import { getUsdcAddress } from "../utils/addressHelpers";
import { OptimismCore } from "@/context/constants";

// Define supported chains
const SUPPORTED_CHAINS = [optimismSepolia, sepolia, zoraSepolia] as const;
const DEFAULT_CHAIN = optimismSepolia;

const modeSepolia = {
  id: 919,
  name: 'Mode Sepolia',
  network: 'mode-sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://sepolia.mode.network'],
    },
    public: {
      http: ['https://sepolia.mode.network'],
    },
  },
  blockExplorers: {
    default: { name: 'Mode Sepolia Explorer', url: 'https://sepolia.explorer.mode.network' },
  },
  testnet: true,
} as const;

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
    data: omniPayCoreBalance,
    isLoading: isOmniPayCoreBalanceLoading,
    error: coreBalanceError,
  } = useReadContract({
    address: OptimismCore as Address,
    abi: MidPayCore.abi,
    chainId: optimismSepolia.id,
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
    <div className="card w-96 bg-base-100 shadow-xl">
      {/* MidPay Balance Section */}
      <div className="card-body">
        <h2 className="card-title text-secondary">Your MidPay Balance</h2>
        <p className="flex justify-center align-middle gap-1">
          <span className="text-3xl font-bold inline-flex items-center">
            {isOmniPayCoreBalanceLoading
              ? "Loading..."
              : coreBalanceError
              ? "Error"
              : toFixed(omniPayCoreBalance as bigint)}
          </span>
          <span className="inline-flex items-center">USDC</span>
        </p>
        
        {/* Error message for core balance */}
        {coreBalanceError && (
          <div className="text-error text-sm text-center mt-2">
            Unable to load MidPay balance
          </div>
        )}
      </div>

      <div className="divider"></div>

      {/* Wallet Balance Section */}
      <div className="card-body">
        <h2 className="card-title text-secondary">
          Your Wallet Balance
          <span className="text-sm font-normal text-gray-500">
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
          <div className="text-error text-sm text-center mt-2">
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
          <div className="text-warning text-sm text-center mt-2">
            Please switch to a supported network
          </div>
        )}
      </div>

      {/* Connection status */}
      {!address && (
        <div className="card-body pt-0">
          <div className="text-warning text-sm text-center">
            Please connect your wallet to view balances
          </div>
        </div>
      )}

      {/* Refresh indicator */}
      <div className="text-xs text-gray-400 text-center pb-2">
        Balances update every 30 seconds
      </div>
    </div>
  );
}