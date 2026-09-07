import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "National Land Acquisition Management System (NLAMS)",
  description: "Government of India - Ministry of Rural Development",
};

/**
 * Viewport configuration — emits:
 *   <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
 * Next.js App Router requires this to be a separate export from `metadata`.
 * Without this the browser renders at desktop scale on Android/iPhone.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col md:flex-row bg-background text-foreground font-sans">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-y-auto bg-background md:min-h-screen">
          {children}
        </main>
      </body>
    </html>
  );
}
