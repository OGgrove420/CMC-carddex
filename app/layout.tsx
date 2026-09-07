import type { Metadata } from "next";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import Providers from "./providers";
import PaymentGate from "../components/payment-gate";

export const metadata: Metadata = {
  title: "CMC CardDex",
  description:
    "Search, catalogue, and track Pokémon cards with Conscious Mind Concepts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
  <PaymentGate>{children}</PaymentGate>
</Providers>
      </body>
    </html>
  );
}
