'use client';

import {
  useAccount,
  useReadContract,
  useWriteContract,
  useChainId,
  useWaitForTransactionReceipt,
} from "wagmi";
import { getMidPayAddress, getUsdcAddress } from "../utils/addressHelpers";
import MidClient from "../abi/MidPayClient.json";
import fakeUSDC from "../abi/FakeUSDC.json";
import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";
import { useRouter } from "next/navigation";
import type { Address, Hash } from "viem";
import { toBigInt } from "@/utils/bigIntHelpers";
import ChainSelector from "./ChainSelector";

interface DepositDialogProps {
  className?: string;
}

export default function DepositDialog({ className }: DepositDialogProps) {
  const chainId = useChainId();
  const { address } = useAccount();
  const [amount, setAmount] = useState<number>(0);
  const [debouncedAmount] = useDebounce(amount, 500);
  const [needsApproval, setNeedsApproval] = useState<boolean>(false);
  const router = useRouter();

  // Read token allowance
  const {
    data: allowance,
    isLoading: isAllowanceLoading,
  } = useReadContract({
    address: getUsdcAddress(chainId) as Address,
    abi: fakeUSDC.abi,
    chainId: chainId,
    functionName: "allowance",
    args: [address, getMidPayAddress(chainId)],
  });

  // Approve contract write
  const {
    writeContract: approve,
    isPending: isApproveLoading,
    data: approveHash,
  } = useWriteContract();

  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveHash,
  });

  // Deposit contract write
  const {
    writeContract: deposit,
    isPending: isDepositLoading,
    data: depositHash,
  } = useWriteContract();

  const { isSuccess: isDepositSuccess } = useWaitForTransactionReceipt({
    hash: depositHash,
  });

  // Handle approval logic
  useEffect(() => {
    const amountBigInt = BigInt(toBigInt(debouncedAmount).toString());
    setNeedsApproval(
      !isApproveSuccess &&
      !isAllowanceLoading &&
      debouncedAmount !== 0 &&
      allowance !== undefined &&
      (allowance as bigint) < amountBigInt
    );
  }, [allowance, debouncedAmount, isAllowanceLoading, isApproveSuccess]);

  // Handle successful deposit
  useEffect(() => {
    if (isDepositSuccess) {
      setTimeout(() => {
        router.refresh();
      }, 5000);
    }
  }, [isDepositSuccess, router]);

  const handleApprove = () => {
    if (!chainId) return;

    approve({
      address: getUsdcAddress(chainId) as Address,
      abi: fakeUSDC.abi,
      chainId: chainId,
      functionName: "approve",
      args: [getMidPayAddress(chainId), toBigInt(debouncedAmount)],
    });
  };

  const handleDeposit = () => {
    if (!chainId) return;

    deposit({
      address: getMidPayAddress(chainId) as Address,
      abi: MidClient.abi,
      chainId: chainId,
      functionName: "deposit",
      args: [toBigInt(debouncedAmount)],
    });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setAmount(value);
  };

  return (
    <div className={`border-2 flex flex-col gap-6 border-black shadow-xl w-full ${className}`}
      style={{
        padding: "clamp(1rem, 1vw, 200rem)",
        boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)" // right + bottom only
      }}
    >
      
        
      <div className="flex flex-col gap-2">
        <h2 className="b-font mb-4" style={{ fontSize: "clamp(1.5rem, 4vw, 3rem)" }}>Deposit Amount</h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 lg:gap-6">
          <div className="flex border-2 border-black flex-row gap-1 w-full sm:w-auto"
            style={{
              padding: "clamp(0.5rem, 1vw, 1rem)",
              boxShadow: "clamp(5px, 1vw, 10px) clamp(5px, 1vw, 10px) 1px rgba(0, 0, 0, 1)"
            }}
          >
            <input
              className="text-left outline-none bg-inherit font-bold s-font leading-none inline-flex items-center w-38 flex-1 min-w-0"
              style={{ fontSize: "clamp(1.25rem, 3vw, 3rem)" }}
              placeholder="0.00"
              inputMode="numeric"
              onChange={handleAmountChange}
              type="number"
              step="0.01"
              min="0"
            />
            <span className="inline-flex s-font leading-none items-center whitespace-nowrap" 
                  style={{ fontSize: "clamp(1rem, 2.5vw, 1.25rem)" }}>
              USDC
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
            {needsApproval && (
              <button
                style={{
                  padding: "clamp(0.5rem, 1vw, 1rem)",
                  boxShadow: "clamp(5px, 1vw, 10px) clamp(5px, 1vw, 10px) 1px rgba(0, 0, 0, 1)",
                  fontSize: "clamp(0.875rem, 2vw, 1rem)"
                }}
                className="text-[#181917] bg-transparent border-2 rounded-full hover:bg-[#181917]/5 cursor-pointer transition-all duration-300 b-font disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                disabled={isApproveLoading || !address}
                onClick={handleApprove}
              >
                {isApproveLoading ? "Approving..." : "Approve"}
              </button>
            )}
            {!needsApproval && (
              <button
                style={{
                  padding: "clamp(0.5rem, 1vw, 1rem)",
                  boxShadow: "clamp(5px, 1vw, 10px) clamp(5px, 1vw, 10px) 1px rgba(0, 0, 0, 1)",
                  fontSize: "clamp(0.875rem, 2vw, 1rem)"
                }}
                className="text-[#181917] bg-transparent border-2 rounded-full hover:bg-[#181917]/5 cursor-pointer transition-all duration-300 b-font disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                disabled={isAllowanceLoading || !address || isDepositLoading}
                onClick={handleDeposit}
              >
                {isDepositLoading ? "Depositing..." : "Deposit"}
              </button>
            )}
          </div>
        </div>
        {(isDepositLoading || isApproveLoading) && (
          <div className="text-black mt-2 sm:mt-4 s-font" 
               style={{ fontSize: "clamp(0.75rem, 2vw, 0.875rem)" }}>
            Confirm in your wallet...
          </div>
        )}
        {isDepositSuccess && (
          <div className="text-black mt-2 sm:mt-4 s-font" 
               style={{ fontSize: "clamp(0.75rem, 2vw, 0.875rem)" }}>
            Deposit successful! Your balance will be updated soon.
          </div>
        )}
      </div>
    </div>
  );
}