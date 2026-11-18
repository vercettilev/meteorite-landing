import type { Metadata, Viewport } from "next";
import { IM_Fell_Double_Pica, IM_Fell_DW_Pica, IM_Fell_DW_Pica_SC } from "next/font/google";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

/* The type waits for its own faces rather than showing a stand-in first and changing. */
const serif = IM_Fell_Double_Pica({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif", display: "block" });
const sans = IM_Fell_DW_Pica({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-sans", display: "block" });
const caps = IM_Fell_DW_Pica_SC({ subsets: ["latin"], weight: "400", variable: "--font-caps", display: "block" });

const TITLE = "Meteorite";
const LINE = "Own a piece of space.";
const CARD = { url: "/og.jpg", width: 1200, height: 630, alt: "A sphere of lunar meteorite on a brass stand, and the words: Own a piece of space." };

export const metadata: Metadata = {
  /* Shared links carry absolute image addresses (lib/site.ts). */
  metadataBase: SITE_URL ? new URL(SITE_URL) : undefined,
  /* The home page is the name alone; any other page puts its own name first ("Legal · Meteorite"). */
  title: { default: TITLE, template: `%s · ${TITLE}` },
  description: LINE,
  openGraph: { title: TITLE, description: LINE, siteName: TITLE, type: "website", images: [CARD] },
  twitter: { card: "summary_large_image", title: TITLE, description: LINE, images: [CARD] },
  /* The SVG for browsers that take one; app/icon.png and app/apple-icon.png for the rest and for a phone's home screen. */
  icons: {
    icon: [
      { url: "/assets/favicon.svg", type: "image/svg+xml" },
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  },
};

/* The browser's own bars take the page's black, so a phone shows no pale strip above the stone. */
export const viewport: Viewport = { themeColor: "#0F0E0C", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* The landing page's first script marks this element when the device is already on the list (components/Landing.tsx), before React has seen it. */
    <html lang="en" className={`${serif.variable} ${sans.variable} ${caps.variable}`} suppressHydrationWarning>
      <body className="font-sans">{children}</body>
    </html>
  );
}
