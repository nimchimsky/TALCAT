import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";

import { PublicFooter } from "@/components/public-footer";

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
  description: "Plataforma de proves TALCAT per a participants i recerca.",
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
          <main>{children}</main>
          <PublicFooter />
        </div>
      </body>
    </html>
  );
}
