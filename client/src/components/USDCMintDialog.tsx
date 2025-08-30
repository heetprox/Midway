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
    <div className={`  h-full border-4 border-black  p-6 w-full ${className}`}
    style={{
      padding: "clamp(1rem, 1vw, 200rem)",
      boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)" // right + bottom only
    }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
        <h2 className="b-font text-3xl text-[#181917] mb-4">Need USDC?</h2>
        <p className="text-lg text-gray-600 mb-6 s-font">
          Mint test USDC tokens to use with the deposit feature.
        </p>
        <button
          className="bg-transparent border-4 text-[#000] text-2xl cursor-pointer hover:bg-[#181917]/5 transition-all duration-300 b-font w-full disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || !address || !chainId}
          onClick={handleMint}
          style={{
            padding: "clamp(1rem, 1vw, 200rem)",
            boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)" // right + bottom only
          }}
        >
          {isLoading ? "Minting..." : "Mint USDC"}
        </button>
        </div>

        {isLoading && (
          <div className="text-black mt-4 s-font">Confirm in your wallet...</div>
        )}
        {isMinting && <div className="text-black text-lg mt-4 s-font">Processing mint...</div>}
        {isSuccess && (
          <div className="text-green-600 mt-4 s-font">
            Successfully minted! Page will refresh shortly.
          </div>
        )}
      </div>
    </div>
  );
}