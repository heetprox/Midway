'use client';

import { useChainId, useSwitchChain } from "wagmi";
import {
  optimismSepolia,
  sepolia as ethSepolia,
  modeTestnet as modeSepolia,
  zoraSepolia,
} from "wagmi/chains";

interface ChainSelectorProps {
  className?: string;
}

const ChainSelector = ({ className }: ChainSelectorProps) => {
  const chainId = useChainId();
  const { switchChain, chains } = useSwitchChain();

  const chainList = [
    { name: "Optimism Sepolia", id: optimismSepolia.id, key: "Optimism" },
    { name: "Ethereum Sepolia", id: ethSepolia.id, key: "Ethereum" },
    { name: "Mode Sepolia", id: modeSepolia.id, key: "Mode" },
    { name: "Zora Sepolia", id: zoraSepolia.id, key: "Zora" },
  ] as const;

  function switchToChain(chainKey: "Optimism" | "Ethereum" | "Mode" | "Zora") {
    const targetChain = chainList.find((c) => c.key === chainKey);
    if (targetChain && switchChain) {
      switchChain({ chainId: targetChain.id });
    }
  }

  // If no chain is connected, return null
  if (!chainId) {
    return null;
  }

  // If current chain is not in our supported chains, show switch button
  const isUnsupportedChain = !chains.find((c) => c.id === chainId);
  if (isUnsupportedChain) {
    return (
      <button
        className="bg-red-600 text-white px-6 py-3 rounded-full hover:bg-red-700 transition-all duration-300 b-font"
        onClick={() => switchToChain("Optimism")}
      >
        Switch to Optimism Sepolia
      </button>
    );
  }

  const currentChain = chainList.find((c) => c.id === chainId);

  return (
    <div className="border-2 border-[#181917] w-fit rounded-full"
    style={{
      padding: "clamp(1rem, 1vw, 200rem)",
      boxShadow: "10px 10px 1px rgba(0, 0, 0, 1)" // right + bottom only
    }}
    >
    <div className="flex  text-lg gap-2 "
     
    >
      <div className="s-font leading-none  text-black ">{"[network]  :  "}</div>
      <select
        onChange={(e) => {
          const selectedChain = chainList.find((c) => c.name === e.target.value);
          if (selectedChain) {
            const chainKey = selectedChain.key as "Optimism" | "Ethereum" | "Mode" | "Zora";
            switchToChain(chainKey);
          }
        }}
        value={currentChain?.name || ""}
        className={` px-4 py-2  s-font leading-none text-black  focus:outline-none  ${className}`}

      >
        {chainList.map((c) => (
          <option
            className="bg-black leading-none text-amber-50"
            key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
    <div className="text-black text-lg s-font leading-none">{"[Testnet only]  "}</div>
    </div>
  );
};

export default ChainSelector;