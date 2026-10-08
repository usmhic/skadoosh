"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/auth";
import { cn } from "@skaddosh/ui/lib/utils";
import { CompassIcon, PenLineIcon, UsersRoundIcon, WalletIcon, type LucideIcon } from "lucide-react";

/** Full-screen editors and auth pages have their own chrome. */
const HIDDEN_PREFIXES = ["/auth", "/studio/works/", "/studio/projects/", "/studio/gallery/", "/portfolio/"];

export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  const { data: session } = useSession();
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  const tabs: Array<{ href: string; label: string; icon: LucideIcon; active: boolean }> = [
    { href: "/", label: "Discover", icon: CompassIcon, active: pathname === "/" || pathname.startsWith("/read") || pathname.startsWith("/projects") },
    { href: "/circles", label: "Circles", icon: UsersRoundIcon, active: pathname.startsWith("/circles") },
    { href: "/kudos", label: "Kudos", icon: WalletIcon, active: pathname.startsWith("/kudos") },
    {
      href: session ? "/studio" : "/auth/signup",
      label: session ? "Studio" : "Create",
      icon: PenLineIcon,
      active: pathname.startsWith("/studio"),
    },
  ];

  return (
    <>
      <div aria-hidden="true" className="h-16 md:hidden" />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      >
        <ul className="grid h-16 grid-cols-4">
          {tabs.map(({ href, label, icon: Icon, active }) => (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[0.68rem] font-medium",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <Icon className={cn("size-5", active && "text-hot")} />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
