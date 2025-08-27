'use client';

import {
  useAccount,
  useReadContract,
  useWriteContract,
  useChainId,
  useWaitForTransactionReceipt,
} from "wagmi";
import { getUsdcAddress } from "../utils/addressHelpers";
import fakeUSDC from "../abi/FakeUSDC.json";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Address } from "viem";

interface USDCMintDialogProps {
  className?: string;
}

export default function USDCMintDialog({ className }: USDCMintDialogProps) {
  const chainId = useChainId();
  const { address } = useAccount();
  const router = useRouter();

  // Check if user has already minted
  const {
    data: isMinted,
    isLoading: isMintedLoading,
  } = useReadContract({
    address: getUsdcAddress(chainId) as Address,
    abi: fakeUSDC.abi,
    chainId: chainId,
    functionName: "minted",
    args: [address],
    query: {
      enabled: Boolean(address && chainId),
    },
  }) as { data: boolean | undefined; isLoading: boolean };

  // Mint contract write
  const {
    writeContract: mint,
    isPending: isLoading,
    data: mintHash,
  } = useWriteContract();

  const { 
    isSuccess, 
    isPending: isMinting 
  } = useWaitForTransactionReceipt({
    hash: mintHash,
  });

  // Handle successful mint
  useEffect(() => {
    if (isSuccess) {
      setTimeout(() => {
        router.refresh();
      }, 2000);
    }
  }, [isSuccess, router]);

  const handleMint = () => {
    if (!chainId || !address) return;
    
    mint({
      address: getUsdcAddress(chainId) as Address,
      abi: fakeUSDC.abi,
      chainId: chainId,
      functionName: "mintOnce",
      args: [address],
    });
  };

  // Don't show if loading or already minted
  if (isMintedLoading || isMinted) {
    return null;
  }

  return (
    <div className={`card w-96 bg-base-100 shadow-xl ${className}`}>
      <div className="card-body">
        <h2 className="card-title">Need USDC?</h2>
        <p className="text-sm text-gray-600 mb-4">
          Mint test USDC tokens to use with the deposit feature.
        </p>
        <button
          className="btn btn-primary"
          disabled={isLoading || !address || !chainId}
          onClick={handleMint}
        >
          {isLoading ? "Minting..." : "Mint USDC"}
        </button>
        {isLoading && (
          <div className="text-info">Confirm in your wallet...</div>
        )}
        {isMinting && <div className="text-info">Processing mint...</div>}
        {isSuccess && (
          <div className="text-success">
            Successfully minted! Page will refresh shortly.
          </div>
        )}
      </div>
    </div>
  );
}