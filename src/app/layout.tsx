import type { Metadata, Viewport } from "next";
import { Amiri, Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({ variable: "--font-nunito", subsets: ["latin"] });
const amiri = Amiri({ variable: "--font-amiri", subsets: ["arabic"], weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Hijaiyah — Belajar membaca huruf hijaiyah",
  description: "Belajar huruf hijaiyah, harakat, dan tanwin langkah demi langkah, lalu cek bacaanmu langsung di browser.",
};

export const viewport: Viewport = { themeColor: "#16a34a" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${nunito.variable} ${amiri.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
