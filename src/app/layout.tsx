import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AmourLive - AI Realtime Romance Simulation",
  description: "Next-gen romance simulation powered by AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
