"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  BellIcon,
  CheckCheckIcon,
  InboxIcon,
  MailIcon,
  RefreshCwIcon,
} from "lucide-react";

function formatRelative(ts: number | string | Date) {
  const d = new Date(ts);
  const diffMins = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMins < 1) return "now";
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationsDropdown() {
  const { data: session } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const portfolio = trpc.portfolios.mine.useQuery(undefined, {
    enabled: !!session,
  });
  const markRead = trpc.portfolios.markInboxRead.useMutation({
    onSuccess: async () => {
      await utils.portfolios.mine.invalidate();
    },
  });

  const messages = portfolio.data?.exists
    ? (portfolio.data.portfolio.inbox ?? [])
    : [];
  const unread = messages.filter((m) => !m.read);
  const recent = [...messages]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 5);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!session) return null;

  function openMessage(id: string) {
    setOpen(false);
    router.push(`/inbox?open=${id}`);
  }

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative size-8"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notifications${unread.length > 0 ? ` · ${unread.length} unread` : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <BellIcon className="size-4" />
        {unread.length > 0 ? (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive ring-2 ring-background" />
        ) : null}
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-popover shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
              Notifications
              {unread.length > 0 ? ` · ${unread.length} unread` : ""}
            </span>
            {unread.length > 0 ? (
              <button
                type="button"
                className="flex items-center gap-1 text-[0.68rem] text-muted-foreground hover:text-foreground"
                onClick={() =>
                  unread.forEach((m) =>
                    markRead.mutate({ id: m.id, read: true }),
                  )
                }
              >
                <CheckCheckIcon className="size-3" /> Mark all read
              </button>
            ) : null}
          </div>

          {portfolio.isPending ? (
            <div className="space-y-3 px-4 py-5" aria-busy="true">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex gap-3">
                  <div className="size-8 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : portfolio.isError ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <p className="text-xs text-muted-foreground">
                Notifications couldn’t be loaded.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void portfolio.refetch()}
              >
                <RefreshCwIcon className="size-3.5" /> Try again
              </Button>
            </div>
          ) : recent.length ? (
            <div className="max-h-80 overflow-y-auto">
              {recent.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => openMessage(m.id)}
                  className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted"
                >
                  {!m.read ? (
                    <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  ) : (
                    <div className="mt-1.5 size-2 shrink-0" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-sm",
                          !m.read && "font-semibold",
                        )}
                      >
                        {m.from.name}
                      </span>
                      <span className="shrink-0 text-[0.6rem] text-muted-foreground">
                        {formatRelative(m.createdAt)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "block truncate text-xs",
                        !m.read ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {m.subject}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {m.body}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <InboxIcon className="size-5 text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">No messages yet.</p>
            </div>
          )}

          <Link
            href="/inbox"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 border-t border-border px-3 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <MailIcon className="size-3.5" /> View all in Inbox
          </Link>
        </div>
      ) : null}
    </div>
  );
}
