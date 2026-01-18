import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DCEM - System Ocen Montessori",
  description: "System ocen śródrocznych dla szkoły Montessori",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-3">
              <img
                src="https://dcem.pl/wp-content/uploads/2022/05/sygnet_poziom_DCEM.png"
                alt="DCEM"
                className="h-8 w-auto"
              />
              <div className="text-sm font-semibold text-slate-700">
                DCEM · System Ocen Montessori
              </div>
            </div>
          </header>
          {children}
        </Providers>
      </body>
    </html>
  );
}
