import type { Metadata } from "next";
import "./globals.css";
// import { AppProvider } from "@/components/app-provider";
import { Toaster } from "@/components/ui/sonner";

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
      <body>
        {/* <AppProvider> */}
        {children}
        <Toaster />
        {/* </AppProvider> */}
      </body>
    </html>
  );
}
