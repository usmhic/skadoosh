"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { cn } from "@skaddosh/ui/lib/utils";
import { BookOpenIcon, CompassIcon, LogInIcon, MapIcon, PenToolIcon, SparklesIcon, WalletIcon, type LucideIcon } from "lucide-react";
import { CreateMenu } from "@/components/header";

/** Full-screen editors, travel collections, and auth pages have their own chrome. */
const HIDDEN_PREFIXES = ["/auth", "/welcome", "/studio/works/", "/studio/projects/", "/studio/gallery/", "/portfolio/", "/travel/"];

type Tab = { href: string; label: string; icon: LucideIcon; active: boolean };

export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const { data: session } = useSession();
  const { data: me } = trpc.users.me.useQuery(undefined, { enabled: !!session });
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;
  const username = (me?.user as { username?: string } | undefined)?.username;

  const explore: Tab = {
    href: session ? "/" : "/explore",
    label: "Explore",
    icon: CompassIcon,
    active: (Boolean(session) && pathname === "/") || pathname.startsWith("/explore") || pathname.startsWith("/read") || pathname.startsWith("/projects"),
  };
  const travel: Tab = { href: "/travel", label: "Travel", icon: MapIcon, active: pathname === "/travel" };
  const left = [explore, travel];
  const right: Tab[] = session
    ? [
        { href: "/kudos", label: "Kudos", icon: WalletIcon, active: pathname.startsWith("/kudos") },
        { href: "/studio", label: "Studio", icon: PenToolIcon, active: pathname.startsWith("/studio") || (Boolean(username) && pathname === `/${username}`) },
      ]
    : [
        { href: "/how-it-works", label: "How it works", icon: BookOpenIcon, active: pathname.startsWith("/how-it-works") },
        { href: "/auth/login", label: "Sign in", icon: LogInIcon, active: false },
      ];

  return (
    <>
      <div aria-hidden="true" className="h-[calc(4.5rem+env(safe-area-inset-bottom))] md:hidden" />
      <nav
        aria-label="Primary"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 rounded-3xl border border-border/80 bg-background/90 shadow-lift backdrop-blur-xl md:hidden"
      >
        <ul className="grid h-16 grid-cols-5 items-center">
          {left.map((tab) => (
            <TabLink key={tab.href} tab={tab} />
          ))}
          <li className="flex justify-center">
            {session ? (
              <CreateMenu compact />
            ) : (
              <Link href="/auth/signup" aria-label="Get started" className="flex size-11 items-center justify-center rounded-full bg-brand text-white shadow-[0_8px_20px_-8px_var(--brand-2)]">
                <SparklesIcon className="size-5" />
              </Link>
            )}
          </li>
          {right.map((tab) => (
            <TabLink key={tab.href} tab={tab} />
          ))}
        </ul>
      </nav>
    </>
  );
}

function TabLink({ tab: { href, label, icon: Icon, active } }: { tab: Tab }) {
  return (
    <li>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex h-full flex-col items-center justify-center gap-1 text-[0.66rem] font-medium transition-colors",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Icon className="size-5" strokeWidth={active ? 2.3 : 1.8} />
        {label}
      </Link>
    </li>
  );
}
