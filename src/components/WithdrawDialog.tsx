'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChainSelector from "./ChainSelector";
import { useDebounce } from "use-debounce";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { Address, formatUnits, parseUnits } from "viem";
import { optimismSepolia, sepolia as ethSepolia, zoraSepolia, modeTestnet as modeSepolia } from "wagmi/chains";
import MidPayCore from "../abi/MidPayCore.json";
import MidPayClient from "../abi/MidPayClient.json";
import { toBigInt, toNumber } from "../utils/bigIntHelpers";

import { OptimismCore } from "@/context/constants";
import { getMidPayAddress } from "@/utils/addressHelpers";

// Define supported chains
const SUPPORTED_CHAINS = [optimismSepolia, ethSepolia, zoraSepolia, modeSepolia] as const;
const DEFAULT_CHAIN = optimismSepolia;

interface WithdrawDialogProps {
  className?: string;
}

export default function WithdrawDialog({ className }: WithdrawDialogProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const router = useRouter();
  
  const [amount, setAmount] = useState<number>(0);
  const [debouncedAmount] = useDebounce(amount, 500);

  // Force connection to Optimism Sepolia if not connected to a supported chain
  useEffect(() => {
    if (chainId && !SUPPORTED_CHAINS.some(chain => chain.id === chainId)) {
      switchChain?.({ chainId: DEFAULT_CHAIN.id });
    }
  }, [chainId, switchChain]);

  const {
    data: MidPayCoreBalance,
    isLoading: isBalanceLoading,
    error: balanceError,
  } = useReadContract({
    address: OptimismCore as Address,
    abi: MidPayCore.abi,
    chainId: optimismSepolia.id,
    functionName: "balances",
    args: [address as Address],
    query: {
      enabled: !!address,
    },
  });

  // Prepare and execute withdrawal
  const {
    writeContract: withdraw,
    isPending: isWithdrawLoading,
    data: withdrawHash,
    error: withdrawError,
  } = useWriteContract();

  const { 
    isSuccess: isWithdrawSuccess,
    isLoading: isConfirming 
  } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  });

  // Handle successful withdrawal
  useEffect(() => {
    if (isWithdrawSuccess) {
      setTimeout(() => {
        router.refresh();
      }, 5000);
    }
  }, [isWithdrawSuccess, router]);

  // Handle withdrawal execution
  const handleWithdraw = () => {
    if (!address || !chainId) return;

    const midpayAddress = getMidPayAddress(chainId);
    if (!midpayAddress) {
      console.error('Midpay address not found for chain:', chainId);
      return;
    }

    withdraw({
      address: midpayAddress as Address,
      abi: MidPayClient.abi,
      functionName: "withdraw",
      args: [toBigInt(debouncedAmount)],
      chainId,
    });
  };

  // Calculate maximum withdrawable amount
  const maxWithdrawAmount = MidPayCoreBalance 
    ? toNumber(MidPayCoreBalance as bigint)
    : 0;

  const isAmountValid = amount > 0 && amount <= maxWithdrawAmount;
  const isWithdrawDisabled = !isAmountValid || isWithdrawLoading || isConfirming;

  return (
    <div className={`bg-white rounded-lg shadow-xl p-6 w-fit ${className}`}>
      <div className="mb-6">
        <h2 className="b-font text-xl mb-4">Select a chain</h2>
        <ChainSelector />
      </div>
      
      <div className="border-t border-[#181917]/20 my-6" />
      
      <div className="mb-6">
        <h2 className="b-font text-xl mb-4">Amount</h2>
        
        {/* Balance display */}
        <div className="text-sm text-gray-600 mb-2 s-font">
          Available balance: {isBalanceLoading 
            ? "Loading..." 
            : balanceError 
              ? "Error loading balance"
              : `${maxWithdrawAmount.toFixed(2)} USDC`
          }
        </div>
        
        <div className="flex flex-row gap-1">
          <input
            className="text-right outline-none border-none bg-inherit text-3xl font-bold inline-flex items-center w-32"
            placeholder="0.00"
            type="number"
            inputMode="numeric"
            step="0.01"
            min="0"
            max={maxWithdrawAmount}
            value={amount || ''}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          />
          <span className="inline-flex items-center">USDC</span>
          
          {/* Max button */}
          <button
            onClick={() => setAmount(maxWithdrawAmount)}
            className="border border-[#181917] text-[#181917] px-4 py-2 rounded-full hover:bg-[#181917] hover:text-[#FEFBEC] transition-all duration-300 b-font ml-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isBalanceLoading || maxWithdrawAmount === 0}
          >
            Max
          </button>
          
          <button
            onClick={handleWithdraw}
            disabled={isWithdrawDisabled}
            className="bg-[#181917] text-[#FEFBEC] px-6 py-3 rounded-full hover:bg-[#181917]/80 transition-all duration-300 b-font ml-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isWithdrawLoading || isConfirming ? "Processing..." : "Withdraw"}
          </button>
        </div>

        {/* Status messages */}
        {(isWithdrawLoading || isConfirming) && (
          <div className="text-blue-600 mt-4 s-font">
            {isWithdrawLoading 
              ? "Confirm in your wallet..." 
              : "Confirming transaction..."
            }
          </div>
        )}
        
        {isWithdrawSuccess && (
          <div className="text-green-600 max-w-xs mt-4 s-font">
            Withdrawal successful! Your tokens will arrive at your wallet soon.
            Refreshing page in 5 seconds...
          </div>
        )}
        
        {withdrawError && (
          <div className="text-red-600 max-w-xs mt-4 s-font">
            Withdrawal failed: {withdrawError.message}
          </div>
        )}
        
        {balanceError && (
          <div className="text-orange-600 text-sm mt-4 s-font">
            Unable to load balance. Please check your connection.
          </div>
        )}

        {/* Amount validation */}
        {amount > 0 && amount > maxWithdrawAmount && (
          <div className="text-orange-600 text-sm mt-4 s-font">
            Amount exceeds available balance
          </div>
        )}
      </div>
    </div>
  );
}