import type { Metadata } from "next";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./globals.css";
import Providers from "./providers";

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
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
