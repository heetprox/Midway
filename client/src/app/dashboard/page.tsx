"use client";

import React, { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import BalanceDialog from "@/components/BalanceDialog";
import DepositDialog from "@/components/DepositDialog";
import WithdrawDialog from "@/components/WithdrawDialog";
import USDCMintDialog from "@/components/USDCMintDialog";

const Dashboard = () => {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  // Ensure we only render after hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Redirect to home if not connected (only after hydration)
  useEffect(() => {
    if (isClient && (!isConnected || !address)) {
      router.push('/');
    }
  }, [isClient, isConnected, address, router]);

  const handleDisconnect = () => {
    disconnect();
    router.push('/');
  };

  // Show loading during hydration or when not connected
  if (!isClient || !isConnected || !address) {
    return (
      <div className="w-full flex flex-col justify-center items-center h-[100vh] min-h-screen bg-[#FEFBEC]">
        <div className="b-font text-2xl">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="w-full min-h-screen h-full bg-[#FEFBEC]"
      style={{
        padding: "clamp(1.25rem, 2vw, 2rem)", // Fixed the 200rem typo
      }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div 
          className="b-font leading-none"
          style={{
            fontSize: "clamp(2rem, 8vw, 4rem)", // Fixed the 200rem typo
          }}
        >
          Midway Dashboard
        </div>
        <button
          onClick={handleDisconnect}
          className="bg-[#181917] text-[#FEFBEC] px-6 py-3 rounded-full hover:bg-[#181917]/80 transition-all duration-300 b-font"
          style={{
            fontSize: "clamp(0.875rem, 1.5vw, 1rem)", // Fixed the 200rem typo
          }}
        >
          Disconnect Wallet
        </button>
      </div>

      {/* Wallet Address Display */}
      <div className="mb-8 text-center">
        <div className="s-font text-lg mb-2">Connected Wallet</div>
        <div className="bg-[#181917]/10 rounded-lg p-4 inline-block">
          <code className="text-sm font-mono">{address}</code>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Balance Display */}
          <div className="flex justify-center">
            <BalanceDialog />
          </div>

          {/* USDC Mint Dialog */}
          <div className="flex justify-center">
            <USDCMintDialog />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Deposit Dialog */}
          <div className="flex justify-center">
            <DepositDialog />
          </div>

          {/* Withdraw Dialog */}
          <div className="flex justify-center">
            <WithdrawDialog />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-16 text-center">
        <div 
          className="s-font leading-none mb-4"
          style={{
            fontSize: "clamp(1rem, 1.5vw, 1.25rem)", // Fixed the 200rem typo
          }}
        >
          Deposit Once, Pay Anywhere
        </div>
        <div className="text-sm text-[#181917]/60">
          Manage your cross-chain USDC deposits and withdrawals
        </div>
      </div>
    </div>
  );
};

export default Dashboard;