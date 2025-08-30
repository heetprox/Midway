"use client";
import React, { useState, useEffect } from 'react';
import { useAccount, useDisconnect } from "wagmi";
import { useRouter } from "next/navigation";
import BalanceDialog from "@/components/BalanceDialog";
import DepositDialog from "@/components/DepositDialog";
import WithdrawDialog from "@/components/WithdrawDialog";
import USDCMintDialog from "@/components/USDCMintDialog";
import ChainSelector from '@/components/ChainSelector';

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
      <div className="w-full flex flex-col justify-center items-center h-screen bg-[#FEFBEC]">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#181917]/20 border-t-[#181917] rounded-full animate-spin"></div>
        </div>
        <div className="b-font text-2xl text-[#181917] mt-6 animate-pulse">Loading Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen h-[100vh] bg-[#FEFBEC] relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-[#181917] blur-3xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-[#181917] blur-2xl"></div>
        <div className="absolute bottom-20 left-1/3 w-40 h-40 rounded-full bg-[#181917] blur-3xl"></div>
      </div>

      <div className="relative w-full h-full z-10" style={{ padding: "clamp(1.25rem, 2vw, 2rem)" }}>
        {/* Header */}
        <div className="flex justify-between h-fit items-center ">
          <div className="group">
            <div
              className="b-font leading-none text-[#181917] transition-all duration-500 group-hover:text-[#181917]/80"
              style={{ fontSize: "clamp(2rem, 8vw, 4rem)" }}
            >
              Midway Dashboard
            </div>
          </div>

          <button
            onClick={handleDisconnect}
            className="relative bg-[#181917] text-[#FEFBEC] px-8 py-4 rounded-full hover:bg-[#181917]/90 transition-all duration-300 b-font shadow-lg hover:shadow-xl transform hover:scale-105 group overflow-hidden"
            style={{ fontSize: "clamp(0.875rem, 1.5vw, 1rem)" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#181917]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative z-10">Disconnect Wallet</span>
          </button>
        </div>


        {/* Main Content Grid */}
        <div className="flex w-full  h-[90vh] gap-6 mx-auto">
          {/* Left Column */}
          <div className="w-[40%] h-full  flex flex-col gap-4">
            {/* Balance Display */}
            <div className="flex w-full h-fit justify-center">
              <div className="w-full h-full">
                <BalanceDialog />
              </div>
            </div>

            {/* USDC Mint Dialog */}
            <div className="flex justify-center h-fit">
              <div className="w-full h-full">
                <USDCMintDialog />
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="w-[60%] flex flex-col gap-4">
            {/* Deposit Dialog */}

            <div className="flex w-full justify-center">
              <div className="w-full">
                <ChainSelector />
              </div>
            </div>
            <div className="flex w-full justify-center">
              <div className="w-full">
                <DepositDialog />
              </div>
            </div>

            {/* Withdraw Dialog */}
            <div className="flex w-full justify-center">
              <div className="w-full">
                <WithdrawDialog />
              </div>
            </div>
          </div>
        </div>


      </div>
    </div>
  );
};

export default Dashboard;