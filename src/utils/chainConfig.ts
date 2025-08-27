import { createPublicClient, http } from "vi        
import { configureChains, createConfig } from "wagmi";
import {
  optimismSepolia,
  sepolia,
  zoraTestnet,
  modeTestnet,
} from "wagmi/chains";
import { InjectedConnector } from "wagmi/connectors/injected";
import { publicProvider } from "wagmi/providers/public";


const { chains, publicClient } = configureChains(
  [optimismSepolia, sepolia, zoraTestnet, modeTestnet],
  [publicProvider()]
);

export const optimismProvider = createPublicClient({
  chain: optimismSepolia,
  transport: http(),
});

export const config = createConfig({
  autoConnect: true,
  connectors: [
    new InjectedConnector({
      chains,
      options: {
        name: "Injected",
        shimDisconnect: true,
      },
    }),
  ],
  publicClient,
});