import type { Metadata } from "next";
import "./globals.css";
import "./fonts.css";
import Web3Provider from "@/components/Web3Provider";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Midway",
  description: "Deposit Once, Pay Anywhere",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script id="web3-compatibility" strategy="beforeInteractive">
          {`
            // Prevent web3 API deprecation warnings and errors
            if (typeof window !== 'undefined') {
              // Override any legacy web3 access attempts
              Object.defineProperty(window, 'web3', {
                get: function() {
                  console.warn('window.web3 is deprecated. Use window.ethereum instead.');
                  return undefined;
                },
                set: function() {
                  // Prevent setting web3
                },
                configurable: false
              });
              
              // Ensure ethereum provider is properly detected
              if (window.ethereum) {
                window.ethereum.autoRefreshOnNetworkChange = false;
              }
            }
          `}
        </Script>
      </head>
      <body
        className={`bg-[#FEFBEC] antialiased`}
      >
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
