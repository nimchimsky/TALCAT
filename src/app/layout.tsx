import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";

import { AppSidebar } from "@/components/app-sidebar";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TALCAT",
  description: "Backoffice per administrar proves online, sessions i resultats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ca">
      <body className={`${dmSans.variable} ${fraunces.variable} antialiased`}>
        <div className="min-h-screen">
          <div className="mx-auto flex min-h-screen w-full max-w-[1480px] gap-6 px-4 py-4 sm:px-6 sm:py-6">
            <AppSidebar />
            <div className="min-w-0 flex-1">
              <main>{children}</main>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
