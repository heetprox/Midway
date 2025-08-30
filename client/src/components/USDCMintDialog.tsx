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
    <div className={`h-full border-4 border-black w-full ${className}`}
      style={{
        padding: "clamp(0.75rem, 1vw, 1.5rem)",
        boxShadow: "clamp(5px, 1vw, 10px) clamp(5px, 1vw, 10px) 1px rgba(0, 0, 0, 1)"
      }}
    >
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col">
          <h2 className="b-font text-[#181917] mb-2 sm:mb-4" 
              style={{ fontSize: "clamp(1.5rem, 4vw, 3rem)" }}>
            Need USDC?
          </h2>
          <p className="text-gray-600 mb-4 sm:mb-6 s-font" 
             style={{ fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)" }}>
            Mint test USDC tokens to use with the deposit feature.
          </p>
          <button
            className="bg-transparent border-4 text-[#000] cursor-pointer hover:bg-[#181917]/5 transition-all duration-300 b-font w-full disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !address || !chainId}
            onClick={handleMint}
            style={{
              padding: "clamp(0.75rem, 1vw, 1.5rem)",
              boxShadow: "clamp(5px, 1vw, 10px) clamp(5px, 1vw, 10px) 1px rgba(0, 0, 0, 1)",
              fontSize: "clamp(1.25rem, 3vw, 2rem)"
            }}
          >
            {isLoading ? "Minting..." : "Mint USDC"}
          </button>
        </div>

        {isLoading && (
          <div className="text-black mt-2 sm:mt-4 s-font" 
               style={{ fontSize: "clamp(0.75rem, 2vw, 0.875rem)" }}>
            Confirm in your wallet...
          </div>
        )}
        {isMinting && (
          <div className="text-black mt-2 sm:mt-4 s-font" 
               style={{ fontSize: "clamp(0.875rem, 2.5vw, 1.125rem)" }}>
            Processing mint...
          </div>
        )}
        {isSuccess && (
          <div className="text-green-600 mt-2 sm:mt-4 s-font" 
               style={{ fontSize: "clamp(0.75rem, 2vw, 0.875rem)" }}>
            Successfully minted! Page will refresh shortly.
          </div>
        )}
      </div>
    </div>
  );
}