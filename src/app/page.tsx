import RoundButton from "@/components/RoundButton";
import Image from "next/image";

export default function Home() {
  return (
    <div className="w-full flex flex-col justify-center items-center h-[100vh] min-h-screen bg-[#FEFBEC]"
      style={{
        padding: "clamp(1.25rem, 2vw, 200rem)",
      }}
    >
      <div className="flex flex-col justify-between w-full h-full">
        <div className=""></div>
        <RoundButton text1="Connect" className="-20" text2="Wallet" link="/" />
        <div className="flex flex-col items-center w-full">
          <div className="b-font leading-none"
            style={{
              fontSize: "clamp(1.25rem, 12vw, 200rem)",
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

        <RoundButton text1="GIVE IT ★" className="20" text2="GITHUB" link="/" />

      </div>
    </div>
  );
}
