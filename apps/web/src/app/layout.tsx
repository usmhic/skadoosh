import type { Metadata } from "next";
import { Amiri, Cairo, Geist, Geist_Mono, Instrument_Serif, Newsreader } from "next/font/google";
import { Providers } from "./providers";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import "@skaddosh/ui/globals.css";

const siteUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://skaddosh");

const cairo = Cairo({
  weight:  ["400", "500", "600", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display:  "swap",
});
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
const amiri = Amiri({
  weight:  ["400", "700"],
  style:   ["normal", "italic"],
  subsets: ["arabic"],
  variable: "--font-amiri",
  display:  "swap",
});
// Display face for headlines; only ships in 400, so headings never use synthetic bold.
const instrumentSerif = Instrument_Serif({
  weight:  ["400"],
  style:   ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display:  "swap",
});
// Long-form reading face for stories, essays, and project write-ups.
const newsreader = Newsreader({
  subsets: ["latin"],
  style:   ["normal", "italic"],
  variable: "--font-newsreader",
  display:  "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "skaddosh",
  title: {
    template: "%s | skaddosh",
    default: "skaddosh — original work, made by people",
  },
  description: "A gallery of original, human-made creative work. Appreciate it with Kudos, back it early, license it, and contribute to it.",
  keywords: [
    "skaddosh",
    "multilingual publishing",
    "creator portfolio",
    "digital writing platform",
    "Arabic writing",
    "English essays",
    "French literature",
    "Spanish stories",
    "independent creators",
    "kudos",
  ],
  authors: [{ name: "usmhic", url: "https://github.com/usmhic" }],
  creator: "skaddosh",
  publisher: "skaddosh",
  category: "publishing",
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      ar: "/",
      fr: "/",
      es: "/",
    },
  },
  icons: {
    icon: [
      { url: "/brand/mark.svg", type: "image/svg+xml" },
      { url: "/brand/logo.png", type: "image/png" },
    ],
    shortcut: "/brand/mark.svg",
    apple: "/brand/logo.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ar_MA", "fr_FR", "es_ES"],
    siteName: "skaddosh",
    title: "skaddosh — original work, made by people",
    description: "Discover, support, license, and collaborate on original creative work.",
    url: "/",
    images: [
      {
        url: "/brand/logo.png",
        width: 1200,
        height: 630,
        alt: "skaddosh",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "skaddosh — original work, made by people",
    description: "Discover, support, license, and collaborate on original creative work.",
    images: ["/brand/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning
      className={[geist.variable, geistMono.variable, cairo.variable, amiri.variable, instrumentSerif.variable, newsreader.variable].join(" ")}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>
          {children}
          <MobileTabBar />
        </Providers>
      </body>
    </html>
  );
}
