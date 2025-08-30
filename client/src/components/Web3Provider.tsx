"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { config } from "@/utils/chainConfig";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry wallet connection errors
        if (error?.message?.includes('web3') || error?.message?.includes('ethereum')) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Ensure window.ethereum is available and clean up any legacy web3
    if (typeof window !== 'undefined') {
      // Remove any legacy web3 references that might interfere
      if ((window as any).web3) {
        delete (window as any).web3;
      }
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
}
