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
    <div className="w-full flex flex-col h-full border-4 border-black rounded-2xl"
    style={{
      padding: "clamp(1.25rem, 2vw, 200rem)"
    }}
    >
      <div className="text-black"> Zora Testnet</div>  
     
    </div>
  );
}