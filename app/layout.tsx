import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
// import { AppProvider } from "@/components/app-provider";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "yuheng",
  description: "AI-powered calorie tracker",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        {/* <AppProvider> */}
        {children}
        <Toaster />
        {/* </AppProvider> */}
      </body>
    </html>
  );
}
