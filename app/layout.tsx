import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
