import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Explore } from "@/components/gallery/explore";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Explore",
  description: "Original art, design, software, music, writing, and research by verified creators.",
};

export default function ExplorePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Suspense>
          <Explore />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  );
}
