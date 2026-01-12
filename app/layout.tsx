import type { Metadata } from "next";
import "./globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
// import { AppProvider } from "@/components/app-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "yuheng",
  description: "AI-powered calorie tracker",
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* <AppProvider> */}
        <NextIntlClientProvider messages={messages}>
          {children}
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
