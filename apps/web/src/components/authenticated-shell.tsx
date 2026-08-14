"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { useSession } from "@/lib/auth";

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const { data: session, isPending } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      const callback = pathname
        ? `?callbackURL=${encodeURIComponent(pathname)}`
        : "";
      router.replace(`/auth/login${callback}`);
    }
  }, [isPending, pathname, router, session]);

  if (isPending || !session) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main
          className="flex flex-1 items-center justify-center px-6"
          aria-busy="true"
          aria-label="Loading your workspace"
        >
          <div className="w-full max-w-sm space-y-4 text-center">
            <div className="mx-auto size-9 animate-spin rounded-full border-2 border-border border-t-primary" />
            <div>
              <p className="text-sm font-medium">Opening your workspace</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This should only take a moment.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
