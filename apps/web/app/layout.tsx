import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { Toaster } from "sonner";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Blackhole Audio Visualizer",
  description: "Interactive GPU-accelerated audio visualizer with gravitational particle physics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ConvexClientProvider>{children}</ConvexClientProvider>
        <Toaster theme="dark" position="bottom-right" />
        <Analytics />
      </body>
    </html>
  );
}
