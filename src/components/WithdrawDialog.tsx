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
    <div className={`card bg-base-100 w-fit shadow-xl ${className}`}>
      <div className="card-body">
        <h2 className="card-title">Select a chain</h2>
        <ChainSelector />
      </div>
      
      <div className="divider" />
      
      <div className="card-body">
        <h2 className="card-title">Amount</h2>
        
        {/* Balance display */}
        <div className="text-sm text-gray-600 mb-2">
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
            className="btn btn-sm btn-outline ml-2"
            disabled={isBalanceLoading || maxWithdrawAmount === 0}
          >
            Max
          </button>
          
          <button
            onClick={handleWithdraw}
            disabled={isWithdrawDisabled}
            className="btn btn-primary ml-8"
          >
            {isWithdrawLoading || isConfirming ? "Processing..." : "Withdraw"}
          </button>
        </div>

        {/* Status messages */}
        {(isWithdrawLoading || isConfirming) && (
          <div className="text-info">
            {isWithdrawLoading 
              ? "Confirm in your wallet..." 
              : "Confirming transaction..."
            }
          </div>
        )}
        
        {isWithdrawSuccess && (
          <div className="text-success max-w-xs">
            Withdrawal successful! Your tokens will arrive at your wallet soon.
            Refreshing page in 5 seconds...
          </div>
        )}
        
        {withdrawError && (
          <div className="text-error max-w-xs">
            Withdrawal failed: {withdrawError.message}
          </div>
        )}
        
        {balanceError && (
          <div className="text-warning text-sm">
            Unable to load balance. Please check your connection.
          </div>
        )}

        {/* Amount validation */}
        {amount > 0 && amount > maxWithdrawAmount && (
          <div className="text-warning text-sm">
            Amount exceeds available balance
          </div>
        )}
      </div>
    </div>
  );
}