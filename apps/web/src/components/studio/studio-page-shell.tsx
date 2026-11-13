import type { ReactNode } from "react";
import { Badge } from "@skaddosh/ui/components/ui/badge";
import { cn } from "@skaddosh/ui/lib/utils";

export function StudioHero({
  title,
  description,
  badge,
  actions,
}: {
  title: string;
  description: string;
  badge?: string;
  actions?: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-[90rem] px-4 pb-2 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-4xl tracking-tight sm:text-5xl">{title}</h1>
            {badge ? <Badge variant="outline">{badge}</Badge> : null}
          </div>
          <p className="mt-2 max-w-3xl text-pretty text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </section>
  );
}

export function StudioMain({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <main className={cn("mx-auto w-full px-4 py-6 sm:px-6 lg:px-8", wide ? "max-w-[90rem]" : "max-w-5xl")}>
      {children}
    </main>
  );
}

export function StudioSectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="rounded-xl border border-border bg-card p-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-muted" />
          <div className="mt-5 h-9 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
