import type { Metadata } from "next";
import { Geist, Geist_Mono, Lato, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { SharedDataProvider } from "./context/SharedDataContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "VOTE",
  description: "VOTE - 投票アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoSansJP.variable} ${lato.variable} antialiased`}
      >
        <SharedDataProvider>{children}</SharedDataProvider>
      </body>
    </html>
  );
}
