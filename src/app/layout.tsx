import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppFooter from "../components/ui/AppFooter";
import ThemeProvider from "../components/ui/ThemeProvider";
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{
              var t=localStorage.getItem('ks-theme');
              if(t==='light'||t==='dark'){
                document.documentElement.setAttribute('data-theme',t);
                if(t==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}
                return;
              }
              if(window.matchMedia('(prefers-color-scheme:light)').matches){
                document.documentElement.setAttribute('data-theme','light');
                document.documentElement.classList.remove('dark');
              } else {
                document.documentElement.setAttribute('data-theme','dark');
                document.documentElement.classList.add('dark');
              }
            }catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <CommandPalette />
          <div className="flex-1">{children}</div>
          <AppFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
