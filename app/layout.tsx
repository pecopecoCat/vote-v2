import type { Metadata } from "next";
import { Lato, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { SharedDataProvider } from "./context/SharedDataContext";
import AppToastHost from "./components/AppToastHost";

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
        className={`${notoSansJP.variable} ${lato.variable} antialiased`}
      >
        <div className="min-h-dvh w-full bg-[var(--color-bg)]">
          <SharedDataProvider>
            {children}
            <AppToastHost />
          </SharedDataProvider>
        </div>
      </body>
    </html>
  );
}
