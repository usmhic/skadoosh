import type { Metadata } from "next";
import { Amiri, Cairo, Fraunces, JetBrains_Mono, Manrope } from "next/font/google";
import { Providers } from "./providers";
import "@skaddosh/ui/globals.css";

const siteUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://skaddosh");

const cairo = Cairo({
  weight:  ["400", "500", "600", "700"],
  subsets: ["arabic", "latin"],
  variable: "--font-cairo",
  display:  "swap",
});
const manrope = Manrope({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});
const amiri = Amiri({
  weight:  ["400", "700"],
  style:   ["normal", "italic"],
  subsets: ["arabic"],
  variable: "--font-amiri",
  display:  "swap",
});
const fraunces = Fraunces({
  weight:  ["500", "600", "700"],
  style:   ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-fraunces",
  display:  "swap",
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "skaddosh",
  title: {
    template: "%s | skaddosh",
    default: "skaddosh - multilingual publishing, reading, and creator portfolios",
  },
  description: "Discover stories, essays, poems, articles, projects, and creator portfolios across Arabic, English, French, and Spanish.",
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
      { url: "/brand/logo.png", type: "image/png" },
    ],
    shortcut: "/brand/logo.png",
    apple: "/brand/logo.png",
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: ["ar_MA", "fr_FR", "es_ES"],
    siteName: "skaddosh",
    title: "skaddosh - multilingual publishing and creator portfolios",
    description: "Read, publish, support, and discover creative work across four languages.",
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
    title: "skaddosh - multilingual publishing and creator portfolios",
    description: "Read, publish, support, and discover creative work across four languages.",
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
      className={[manrope.variable, jetbrainsMono.variable, cairo.variable, amiri.variable, fraunces.variable].join(" ")}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
