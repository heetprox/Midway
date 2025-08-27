'use client';

import {
  useAccount,
  useReadContract,
  useWriteContract,
  useChainId,
  useWaitForTransactionReceipt,
} from "wagmi";
import { getOmniPayAddress, getUsdcAddress } from "../utils/addressHelpers";
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
    args: [address, getOmniPayAddress(chainId)],
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
        args: [getOmniPayAddress(chainId), toBigInt(debouncedAmount)],
        });
    };

    const handleDeposit = () => {
        if (!chainId) return;
        
        deposit({
      address: getOmniPayAddress(chainId) as Address,
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
    <div className={`card bg-base-100 w-fit shadow-xl ${className}`}>
      <div className="card-body">
        <h2 className="card-title">Select a chain</h2>
        <ChainSelector />
      </div>
      <div className="divider" />
      <div className="card-body">
        <h2 className="card-title">Amount</h2>
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
              className="btn btn-primary ml-8"
              disabled={isApproveLoading || !address}
              onClick={handleApprove}
            >
              {isApproveLoading ? "Approving..." : "Approve"}
            </button>
          )}
          {!needsApproval && (
            <button
              className="btn btn-primary ml-8"
              disabled={isAllowanceLoading || !address || isDepositLoading}
              onClick={handleDeposit}
            >
              {isDepositLoading ? "Depositing..." : "Deposit"}
            </button>
          )}
        </div>
        {(isDepositLoading || isApproveLoading) && (
          <div className="text-info">Confirm in your wallet...</div>
        )}
        {isDepositSuccess && (
          <div className="text-success max-w-xs">
            Deposit successful! Your balance will be updated soon.
          </div>
        )}
      </div>
    </div>
  );
}