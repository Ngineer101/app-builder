import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "App Builder (POC)",
  description: "Generate and iterate on apps inside Vercel Sandbox",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-grain">{children}</body>
    </html>
  );
}
