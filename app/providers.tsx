"use client";
import { WalletAdapterNetwork } from
  "@solana/wallet-adapter-base";
import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
} from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";

export default function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  const endpoint = useMemo(
    () => clusterApiUrl("devnet"),
    []
  );

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({
        network: network: WalletAdapterNetwork.Devnet,,
      }),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider
        wallets={wallets}
        autoConnect
        onError={(error) => {
          console.error("wallet connection error", error);
        }}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
