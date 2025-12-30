import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { QueryClientProvider } from "@/lib/providers/QueryClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LiteVault - Store now, recall later",
  description: "A lightweight knowledge capture and retrieval tool with AI-powered insights",
  icons: {
    icon: [
      { url: '/brand/favicon/favicon.ico?v=3', sizes: 'any' },
      { url: '/brand/favicon/favicon-32x32.png?v=3', type: 'image/png' },
    ],
    apple: '/brand/favicon/apple-touch-icon.png?v=3',
  },
  manifest: '/brand/favicon/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <QueryClientProvider>
        <html lang="en">
          <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          >
            <AppShell>{children}</AppShell>
          </body>
        </html>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
