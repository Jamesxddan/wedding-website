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
  description: "Join us as we celebrate the wedding of James Daniel & Sharon on October 8th, 2026 in Chennai. Two are better than one.",
  metadataBase: new URL("https://jamesandsharon.com"),
  openGraph: {
    title: "James & Sharon — October 8, 2026",
    description: "Join us as we celebrate the wedding of James Daniel & Sharon on October 8th, 2026 in Chennai.",
    type: "website",
    url: "/",
    images: [
      {
        url: "/wax-seal.png",
        width: 1200,
        height: 630,
        alt: "James & Sharon — Wedding, October 8 2026",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "James & Sharon — October 8, 2026",
    description: "Join us as we celebrate the wedding of James Daniel & Sharon on October 8th, 2026 in Chennai.",
    images: ["/wax-seal.png"],
  },
  other: {
    "theme-color": "#8B4A6B",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${cormorant.variable} ${inter.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-cream text-deep-rose font-body" suppressHydrationWarning>
        <DevViewportFrame>{children}</DevViewportFrame>
        <DevPanel />
      </body>
    </html>
  );
}
