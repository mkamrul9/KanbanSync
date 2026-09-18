import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppFooter from "../components/ui/AppFooter";
import CommandPalette from "../components/ui/CommandPalette";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KanbanSync",
  description: "Collaborative Kanban workspace for teams",
  manifest: "/manifest.json",
  themeColor: "#6366F1",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "KanbanSync" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <div className="flex-1">{children}</div>
        <AppFooter />
        <CommandPalette />
      </body>
    </html>
  );
}
