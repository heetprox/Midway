import RoundButton from "@/components/RoundButton";
import Image from "next/image";

export default function Home() {
  return (
   <div className="w-full flex flex-col justify-center items-center h-full min-h-screen bg-[#FEFBEC]">
    <RoundButton text1="Connect" text2="Wallet" link="/" />
   </div>
  );
}
