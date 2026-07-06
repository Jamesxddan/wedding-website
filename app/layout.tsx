import type { Metadata } from "next";
import { Playfair_Display, Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import DevPanel from "@/components/ui/DevPanel";
import DevViewportFrame from "@/components/ui/DevViewportFrame";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "600", "700"],
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-cormorant",
  style: ["italic", "normal"],
  weight: ["400", "500"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "James & Sharon — October 8, 2026",
  description: "Join us as we celebrate our wedding on October 8th, 2026 in Chennai.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${cormorant.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-cream text-deep-rose font-body">
        <DevViewportFrame>{children}</DevViewportFrame>
        <DevPanel />
      </body>
    </html>
  );
}
