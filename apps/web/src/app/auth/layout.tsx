import type { ReactNode } from "react";
import { BadgeCheckIcon, HandHeartIcon, MapIcon } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const POINTS = [
  { icon: BadgeCheckIcon, text: "Original work by verified people" },
  { icon: HandHeartIcon, text: "Appreciate, back, license, or contribute" },
  { icon: MapIcon, text: "Plan the journeys behind your work" },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-brand p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div aria-hidden className="bg-dots absolute inset-0 opacity-25 mix-blend-overlay" />
        <BrandMark className="relative [&_span]:text-white" />
        <div className="relative max-w-md">
          <h2 className="text-balance font-display text-5xl leading-[1.05]">Where original work finds its people.</h2>
          <ul className="mt-10 space-y-4 text-white/90">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/70">Free to join. No paid boosts, ever.</p>
      </aside>
      <main className="flex flex-col items-center justify-center bg-background px-4 py-12 sm:px-8">
        <BrandMark className="mb-8 lg:hidden" />
        <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-7 shadow-soft sm:p-8 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          {children}
        </div>
      </main>
    </div>
  );
}
