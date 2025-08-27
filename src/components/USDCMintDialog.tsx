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
    <div className={`bg-white rounded-lg shadow-xl p-6 w-96 ${className}`}>
      <div>
        <h2 className="b-font text-xl text-[#181917] mb-4">Need USDC?</h2>
        <p className="text-sm text-gray-600 mb-6 s-font">
          Mint test USDC tokens to use with the deposit feature.
        </p>
        <button
          className="bg-[#181917] text-[#FEFBEC] px-6 py-3 rounded-full hover:bg-[#181917]/80 transition-all duration-300 b-font w-full disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || !address || !chainId}
          onClick={handleMint}
        >
          {isLoading ? "Minting..." : "Mint USDC"}
        </button>
        {isLoading && (
          <div className="text-blue-600 mt-4 s-font">Confirm in your wallet...</div>
        )}
        {isMinting && <div className="text-blue-600 mt-4 s-font">Processing mint...</div>}
        {isSuccess && (
          <div className="text-green-600 mt-4 s-font">
            Successfully minted! Page will refresh shortly.
          </div>
        )}
      </div>
    </div>
  );
}