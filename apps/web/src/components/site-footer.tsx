import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

const COLUMNS = [
  {
    title: "Discover",
    links: [
      { href: "/explore", label: "Explore" },
      { href: "/travel", label: "Travel" },
      { href: "/read", label: "Read" },
    ],
  },
  {
    title: "Create",
    links: [
      { href: "/studio", label: "Studio" },
      { href: "/travel", label: "Travel collections" },
      { href: "/portfolio/edit", label: "Portfolio" },
    ],
  },
  {
    title: "skaddosh",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/auth/signup", label: "Join" },
      { href: "/auth/login", label: "Sign in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/40">
      <div className="mx-auto grid max-w-[90rem] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div className="max-w-xs">
          <BrandMark />
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            A home for original work made by people, and for the journeys behind it.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{column.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-foreground/80 transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border/60">
        <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} skaddosh</p>
          <p>
            Maps © <a href="https://www.openstreetmap.org/copyright" className="underline-offset-2 hover:underline">OpenStreetMap contributors</a>.
            Routing by <a href="https://openrouteservice.org" className="underline-offset-2 hover:underline">openrouteservice</a>.
          </p>
        </div>
      </div>
    </footer>
  );
}
