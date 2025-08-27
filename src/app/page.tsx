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
        <RoundButton text1="Connect" text2="Wallet" link="/" />
        <div className="flex flex-col items-center w-full">
          <div className="b-font leading-none"
            style={{
              fontSize: "clamp(1.25rem, 13vw, 200rem)",
            }}
          >Midway</div>
        </div>

        <RoundButton text1="GIVE IT ★" text2="GITHUB" link="/" />

      </div>
    </div>
  );
}
