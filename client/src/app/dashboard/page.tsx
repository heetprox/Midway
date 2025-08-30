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
    <div className="w-full min-h-screen h-[135vh] bg-[#FEFBEC] relative"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-[#181917] blur-3xl"></div>
        <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-[#181917] blur-2xl"></div>
        <div className="absolute bottom-20 left-1/3 w-40 h-40 rounded-full bg-[#181917] blur-3xl"></div>
      </div>

      <div className="relative w-full items-center flex flex-col gap-6 h-full z-10" style={{ padding: "clamp(1rem, 2vw, 2rem)" }}>
        {/* Header */}
        <div className="flex justify-between h-fit w-[95%] md:w-[60%] lg:w-[50%] xl:w-[45%] 2xl:w-[40%] items-center ">
          <div className="group">
            <div
              className="b-font leading-none text-[#181917] transition-all duration-500 group-hover:text-[#181917]/80"
              style={{ fontSize: "clamp(2rem, 8vw, 4rem)" }}
            >
              Midway
            </div>
          </div>


        </div>


        {/* Main Content Grid */}
        <div className="flex flex-col w-[95%] md:w-[60%] lg:w-[50%] xl:w-[45%] 2xl:w-[40%]  h-[90vh] gap-6 mx-auto">
          {/* Left Column */}
          <div className="w-full h-full  flex flex-col gap-6">

            <div className="flex w-full h-fit gap-4 justify-start">
              <div className="w-fit h-full">
                <ChainSelector />

              </div>
              <button
                onClick={handleDisconnect}
                className="relative text-black cursor-pointer rounded-full border-2  px-8 py-4 hover:bg-[#181917]/5 transition-all duration-300 s-font  overflow-hidden"

                style={{
                  fontSize: "clamp(1rem, 1vw, 100rem)",
                  padding: "clamp(1rem, 1vw, 200rem)",
                  boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)"
                }}
              >
                
                <span className="relative z-10">Disconnect Wallet</span>
              </button>
            </div>
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
          <div className="w-full flex flex-col gap-6">
            {/* Deposit Dialog */}


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