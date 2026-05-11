import type { Metadata } from "next";
import "./globals.css";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { AuthProvider } from "@/lib/auth/auth-context";
import { AuthGuard } from "@/components/auth-guard";
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
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <AuthGuard>
              {children}
            </AuthGuard>
            <Toaster />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
