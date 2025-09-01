
"use client";

import RoundButton from "@/components/RoundButton";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { redirect, useRouter } from "next/navigation";
import { useEffect } from "react";


const Home = () => {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const router = useRouter();

  const handleConnect = () => {
    connect({ connector: connectors[0] });
    if (isConnected && address) {
      redirect('/dashboard');
    }
  }

  // Redirect to dashboard when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      router.push('/dashboard');
    }
  }, [isConnected, address, router]);
  return (
    <div className="w-full flex flex-col justify-center items-center h-[100vh] min-h-screen bg-[#FEFBEC]"
      style={{
        padding: "clamp(3rem, 2vw, 200rem)",
      }}
    >
      <div className="flex flex-col justify-between w-full h-full">
        <div className="w-full flex justify-end"
          style={{
            padding: "0 clamp(1.25rem, 2vw, 200rem)",
          }}
          onClick={handleConnect}
        >
          <RoundButton text1="Connect" className="-20" text2="Wallet" link="/" />
        </div>
        <div className="flex flex-col items-center w-full">
          <div className="b-font leading-none"
            style={{
              fontSize: "clamp(2.25rem, 12vw, 200rem)",
            }}
          >
            Midway
          </div>

          <div className="s-font leading-none"
            style={{
              fontSize: "clamp(1.25rem,2vw, 200rem)",
            }}
          >
            Deposit Once, Pay Anywhere
          </div>
        </div>
        <div className="w-full flex justify-start"
          style={{
            padding: "clamp(1.25rem, 2vw, 200rem)",
          }}
        >
          <RoundButton text1="GIVE IT ★" className="20" text2="GITHUB" link="/" />
        </div>
      </div>
    </div>
  );
}
export default Home;