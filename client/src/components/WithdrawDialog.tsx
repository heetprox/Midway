'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useDebounce } from "use-debounce";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useChainId,
} from "wagmi";
import { Address } from "viem";
import { 
  optimismSepolia, 
} from "wagmi/chains";
import MidPayCore from "../abi/MidPayCore.json";
import MidPayClient from "../abi/MidPayClient.json";
import { toBigInt, toNumber } from "../utils/bigIntHelpers";

import { OptimismCore } from "@/context/constants";
import { getMidPayAddress } from "@/utils/addressHelpers";
import { useCrossChainProcessor } from "./CrossChainProcessor";

interface WithdrawDialogProps {
  className?: string;
}

export default function WithdrawDialog({ className }: WithdrawDialogProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  
  const [amount, setAmount] = useState<number>(0);
  const [debouncedAmount] = useDebounce(amount, 500);
  const [crossChainStatus, setCrossChainStatus] = useState<string>('');
  const [isWithdrawFlowComplete, setIsWithdrawFlowComplete] = useState<boolean>(false);
  const { isProcessing: isCrossChainProcessing, processAfterTransaction } = useCrossChainProcessor();

  // Note: Removed automatic chain switching to allow users to freely switch between supported chains
  // Read MidPay balance from core contract on Optimism Sepolia
  // Note: Must use REAL blockchain chain ID for wagmi contract reads
  const {
    data: MidPayCoreBalance,
    isLoading: isBalanceLoading,
    error: balanceError,
  } = useReadContract({
    address: OptimismCore as Address,
    abi: MidPayCore.abi,
    chainId: optimismSepolia.id, // Use REAL Optimism Sepolia chain ID (11155420)
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
    if (isWithdrawSuccess && withdrawHash && !isWithdrawFlowComplete) {
      setCrossChainStatus('🔍 Scanning all chains for pending messages...');
      setIsWithdrawFlowComplete(true); // Mark that we've started the flow
      
      // Trigger cross-chain processing
      processAfterTransaction(withdrawHash)
        .then((success) => {
          if (success) {
            setCrossChainStatus('✅ Cross-chain messages processed successfully!');
            console.log('✅ Withdrawal and cross-chain processing completed successfully!');
          } else {
            setCrossChainStatus('📭 No cross-chain messages found - withdrawal complete!');
            console.log('📭 Withdrawal completed, no cross-chain messages found');
          }
        })
        .catch((error) => {
          setCrossChainStatus('⚠️ Cross-chain processing failed, but withdrawal was successful');
          console.error('❌ Cross-chain processing failed:', error);
          // Still continue with the normal flow even if cross-chain processing fails
        })
        .finally(() => {
          // Show final status for a moment, then reset for next withdrawal
          setTimeout(() => {
            setCrossChainStatus('');
            setAmount(0); // Reset amount for next withdrawal
            setIsWithdrawFlowComplete(false); // Reset for next withdrawal
            router.refresh();
          }, 3000);
        });
    }
  }, [isWithdrawSuccess, withdrawHash, isWithdrawFlowComplete, processAfterTransaction, router]);

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
    <div className={`border-2 border-black shadow-xl w-full ${className}`}
      style={{
        padding: "clamp(1rem, 1vw, 200rem)",
        boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)" // right + bottom only
      }}
    >
            <div className="flex flex-col gap-2">
        <h2 className="b-font mb-4" style={{ fontSize: "clamp(1.5rem, 4vw, 3rem)" }}>Withdraw Amount</h2>
        
        {/* Balance display */}
        <div className="text-gray-600 mb-2 s-font" style={{ fontSize: "clamp(0.75rem, 2vw, 0.875rem)" }}>
          Available balance: {isBalanceLoading 
            ? "Loading..." 
            : balanceError 
              ? "Error loading balance"
              : `${maxWithdrawAmount.toFixed(2)} FUSD`
          }
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 lg:gap-6">
          <div className="flex border-2 border-black flex-row gap-1 w-full sm:w-auto"
            style={{
              padding: "clamp(0.5rem, 1vw, 1rem)",
              boxShadow: "clamp(5px, 1vw, 10px) clamp(5px, 1vw, 10px) 1px rgba(0, 0, 0, 1)"
            }}
          >
            <input
              className="text-left outline-none bg-inherit font-bold s-font leading-none inline-flex items-center flex-1 min-w-0"
              style={{ fontSize: "clamp(1.25rem, 3vw, 3rem)" }}
              placeholder="0.00"
              type="number"
              inputMode="numeric"
              step="0.01"
              min="0"
              max={maxWithdrawAmount}
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            />
            <span className="inline-flex s-font leading-none items-center whitespace-nowrap" 
                  style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)" }}>
              FUSD
            </span>
          </div>
          
          <div className="flex sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            {/* Max button */}
            <button
              onClick={() => setAmount(maxWithdrawAmount)}
              style={{
                padding: "clamp(0.5rem, 1vw, 1rem)",
                boxShadow: "clamp(5px, 1vw, 10px) clamp(5px, 1vw, 10px) 1px rgba(0, 0, 0, 1)",
                fontSize: "clamp(0.875rem, 2vw, 1rem)"
              }}
              className="text-[#181917] bg-transparent border-2 rounded-full hover:bg-[#181917]/5 cursor-pointer transition-all duration-300 b-font disabled:opacity-50 disabled:cursor-not-allowed aspect-square w-full sm:w-auto"
              disabled={isBalanceLoading || maxWithdrawAmount === 0}
            >
              Max
            </button>
            
            {(!isWithdrawSuccess || !isWithdrawFlowComplete) && (
              <button
                onClick={handleWithdraw}
                disabled={isWithdrawDisabled}
                style={{
                  padding: "clamp(0.5rem, 1vw, 1rem)",
                  boxShadow: "clamp(5px, 1vw, 10px) clamp(5px, 1vw, 10px) 1px rgba(0, 0, 0, 1)",
                  fontSize: "clamp(0.875rem, 2vw, 1rem)"
                }}
                className="text-[#181917] bg-transparent border-2 rounded-full hover:bg-[#181917]/5 cursor-pointer transition-all duration-300 b-font disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                {isWithdrawLoading || isConfirming ? "Processing..." : "Withdraw"}
              </button>
            )}
            {isWithdrawSuccess && isWithdrawFlowComplete && isCrossChainProcessing && (
                  <button
                  onClick={handleWithdraw}
                  disabled={isWithdrawLoading || isConfirming}
                  style={{
                    padding: "clamp(0.5rem, 1vw, 1rem)",
                    boxShadow: "clamp(5px, 1vw, 10px) clamp(5px, 1vw, 10px) 1px rgba(0, 0, 0, 1)",
                    fontSize: "clamp(0.875rem, 2vw, 1rem)"
                  }}
                  className="text-[#181917] bg-yellow-100 border-2 rounded-full hover:bg-[#181917]/5 cursor-pointer transition-all duration-300 b-font disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                >
                  Processing...
                </button>
            )}
          </div>
        </div>

        {/* Status messages */}
        {(isWithdrawLoading || isConfirming) && (
          <div className="text-black mt-2 sm:mt-4 s-font" 
               style={{ fontSize: "clamp(0.75rem, 2vw, 0.875rem)" }}>
            Confirm in your wallet...
          </div>
        )}
        {isWithdrawSuccess && isWithdrawFlowComplete && (
          <div className="text-black mt-2 sm:mt-4 s-font" 
               style={{ fontSize: "clamp(0.75rem, 2vw, 0.875rem)" }}>
            {isCrossChainProcessing && crossChainStatus ? (
              <div className="space-y-1 text-lg">
                <div>✅ Withdrawal successful!</div>
                <div className="text-black">{crossChainStatus}</div>
                <div className="text-black text-lg">Please wait, this may take up to 1 minute... after balance update refresh the page for more withdrawals</div>
              </div>
            ) : crossChainStatus ? (
              <div>{crossChainStatus}</div>
            ) : (
              "✅ Withdrawal completed! Your balance will be updated soon."
            )}
          </div>
        )}
        
        {withdrawError && (
          <div className="text-red-600 mt-2 sm:mt-4 s-font" 
               style={{ fontSize: "clamp(0.75rem, 2vw, 0.875rem)" }}>
            Withdrawal failed: {withdrawError.message}
          </div>
        )}
        
        {balanceError && (
          <div className="text-orange-600 mt-2 sm:mt-4 s-font" 
               style={{ fontSize: "clamp(0.75rem, 2vw, 0.875rem)" }}>
            Unable to load balance. Please check your connection.
          </div>
        )}

        {/* Amount validation */}
        {amount > 0 && amount > maxWithdrawAmount && (
          <div className="text-orange-600 mt-2 sm:mt-4 s-font" 
               style={{ fontSize: "clamp(0.75rem, 2vw, 0.875rem)" }}>
            Amount exceeds available balance
          </div>
        )}
      </div>
    </div>
  );
}