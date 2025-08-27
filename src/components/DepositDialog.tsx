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
    <div className={`bg-white rounded-lg shadow-xl p-6 w-fit ${className}`}>
      <div className="mb-6">
        <h2 className="b-font text-xl mb-4">Select a chain</h2>
        <ChainSelector />
      </div>
      <div className="border-t border-[#181917]/20 my-6" />
      <div className="mb-6">
        <h2 className="b-font text-xl mb-4">Amount</h2>
        <div className="flex flex-row gap-1">
          <input
            className="text-right outline-none border-none bg-inherit text-3xl font-bold inline-flex items-center w-32"
            placeholder="0.00"
            inputMode="numeric"
            onChange={handleAmountChange}
            type="number"
            step="0.01"
            min="0"
          />
          <span className="inline-flex items-center">USDC</span>
          {needsApproval && (
            <button
              className="bg-[#181917] text-[#FEFBEC] px-6 py-3 rounded-full hover:bg-[#181917]/80 transition-all duration-300 b-font ml-8 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isApproveLoading || !address}
              onClick={handleApprove}
            >
              {isApproveLoading ? "Approving..." : "Approve"}
            </button>
          )}
          {!needsApproval && (
            <button
              className="bg-[#181917] text-[#FEFBEC] px-6 py-3 rounded-full hover:bg-[#181917]/80 transition-all duration-300 b-font ml-8 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAllowanceLoading || !address || isDepositLoading}
              onClick={handleDeposit}
            >
              {isDepositLoading ? "Depositing..." : "Deposit"}
            </button>
          )}
        </div>
        {(isDepositLoading || isApproveLoading) && (
          <div className="text-blue-600 mt-4 s-font">Confirm in your wallet...</div>
        )}
        {isDepositSuccess && (
          <div className="text-green-600 max-w-xs mt-4 s-font">
            Deposit successful! Your balance will be updated soon.
          </div>
        )}
      </div>
    </div>
  );
}