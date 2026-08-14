"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { ConfirmDialog } from "@skaddosh/ui/components/confirm-dialog";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  CheckCheckIcon,
  InboxIcon,
  MailIcon,
  MailOpenIcon,
  TrashIcon,
} from "lucide-react";

type Filter = "all" | "unread";

function formatDate(ts: number | string | Date) {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0)
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  if (diffDays < 7)
    return d.toLocaleDateString(undefined, { weekday: "short" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
      {initials}
    </div>
  );
}

export default function InboxPage() {
  const searchParams = useSearchParams();
  const utils = trpc.useUtils();
  const portfolio = trpc.portfolios.mine.useQuery();
  const [confirmAction, setConfirmAction] = useState<
    { kind: "clear" } | { kind: "delete"; id: string; subject: string } | null
  >(null);
  const [actionError, setActionError] = useState("");

  const markRead = trpc.portfolios.markInboxRead.useMutation({
    onSuccess: async () => {
      await utils.portfolios.mine.invalidate();
    },
  });
  const removeMessage = trpc.portfolios.removeInboxMessage.useMutation({
    onSuccess: async () => {
      await utils.portfolios.mine.invalidate();
      setConfirmAction(null);
      setExpanded(null);
    },
    onError: (error) => setActionError(error.message),
  });
  const clearInbox = trpc.portfolios.clearInbox.useMutation({
    onSuccess: async () => {
      await utils.portfolios.mine.invalidate();
      setConfirmAction(null);
      setExpanded(null);
    },
    onError: (error) => setActionError(error.message),
  });

  const [filter, setFilter] = useState<Filter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const allMessages = portfolio.data?.exists
    ? (portfolio.data.portfolio.inbox ?? [])
    : [];
  const messages =
    filter === "unread" ? allMessages.filter((m) => !m.read) : allMessages;
  const unreadCount = allMessages.filter((m) => !m.read).length;

  function handleExpand(id: string, isRead: boolean) {
    setExpanded((prev) => (prev === id ? null : id));
    if (!isRead) markRead.mutate({ id, read: true });
  }

  useEffect(() => {
    const openId = searchParams.get("open");
    if (!openId) return;
    const message = allMessages.find((m) => m.id === openId);
    if (!message) return;
    setExpanded(openId);
    if (!message.read) markRead.mutate({ id: openId, read: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, allMessages.length]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight">Inbox</h1>
          {allMessages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                setActionError("");
                setConfirmAction({ kind: "clear" });
              }}
              disabled={clearInbox.isPending}
            >
              Clear all
            </Button>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Messages from your portfolio contact form.
        </p>
      </div>

      {/* Filter strip */}
      {allMessages.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex rounded-lg border border-border bg-muted/40 p-0.5">
            {(["all", "unread"] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition",
                  filter === f
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "unread" ? `Unread (${unreadCount})` : "All"}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() =>
                allMessages
                  .filter((m) => !m.read)
                  .forEach((m) => markRead.mutate({ id: m.id, read: true }))
              }
            >
              <CheckCheckIcon className="size-3.5" /> Mark all read
            </button>
          )}
        </div>
      )}

      {/* Message list */}
      {actionError ? (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {actionError}
        </div>
      ) : null}

      {portfolio.isPending ? (
        <MessageSkeleton />
      ) : messages.length > 0 ? (
        <div className="space-y-2">
          {messages.map((message) => {
            const isExpanded = expanded === message.id;
            return (
              <div
                key={message.id}
                className={cn(
                  "overflow-hidden rounded-xl border transition-all",
                  !message.read
                    ? "border-primary/30 bg-primary/[0.025]"
                    : "border-border bg-card",
                )}
              >
                {/* Row */}
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-4 py-3.5 text-left"
                  onClick={() => handleExpand(message.id, message.read)}
                >
                  <Avatar name={message.from.name} />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-sm",
                          !message.read && "font-semibold",
                        )}
                      >
                        {message.from.name}
                      </p>
                      <span className="shrink-0 text-[0.65rem] text-muted-foreground">
                        {formatDate(message.createdAt)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-xs",
                        !message.read
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {message.subject}
                    </p>
                    {!isExpanded && (
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {message.body}
                      </p>
                    )}
                  </div>

                  {/* Unread dot */}
                  {!message.read && (
                    <div className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  )}
                </button>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="border-t border-border/60 px-4 pb-4 pt-3">
                    {/* Sender detail */}
                    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {message.from.email && (
                        <span>
                          <span className="font-medium text-foreground">
                            Email:
                          </span>{" "}
                          <a
                            href={`mailto:${message.from.email}`}
                            className="hover:underline"
                          >
                            {message.from.email}
                          </a>
                        </span>
                      )}
                      {message.from.phone && (
                        <span>
                          <span className="font-medium text-foreground">
                            Phone:
                          </span>{" "}
                          {message.from.phone}
                        </span>
                      )}
                      {message.from.company && (
                        <span>
                          <span className="font-medium text-foreground">
                            Company:
                          </span>{" "}
                          {message.from.company}
                        </span>
                      )}
                    </div>

                    {/* Message body */}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {message.body}
                    </p>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-2">
                      {message.from.email && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={`mailto:${message.from.email}?subject=Re: ${encodeURIComponent(message.subject)}`}
                          >
                            <MailIcon className="size-3.5 mr-1.5" /> Reply
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() =>
                          markRead.mutate({
                            id: message.id,
                            read: !message.read,
                          })
                        }
                        disabled={markRead.isPending}
                      >
                        {message.read ? (
                          <>
                            <MailIcon className="size-3.5 mr-1.5" /> Mark unread
                          </>
                        ) : (
                          <>
                            <MailOpenIcon className="size-3.5 mr-1.5" /> Mark
                            read
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          setActionError("");
                          setConfirmAction({
                            kind: "delete",
                            id: message.id,
                            subject: message.subject,
                          });
                        }}
                        disabled={removeMessage.isPending}
                      >
                        <TrashIcon className="size-3.5 mr-1.5" /> Delete
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card px-6 py-24 text-center">
          <div className="flex size-11 items-center justify-center rounded-full bg-muted">
            <InboxIcon className="size-5 text-muted-foreground/50" />
          </div>
          <div>
            <p className="text-sm font-medium">
              {filter === "unread" ? "No unread messages" : "No messages yet"}
            </p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">
              {filter === "unread"
                ? "You've read everything."
                : "Contact messages from your portfolio will appear here."}
            </p>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmAction !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
        title={
          confirmAction?.kind === "clear"
            ? "Clear your inbox?"
            : "Delete this message?"
        }
        description={
          confirmAction?.kind === "clear"
            ? `This permanently removes all ${allMessages.length} message${allMessages.length === 1 ? "" : "s"}. This cannot be undone.`
            : `“${confirmAction?.subject ?? "This message"}” will be permanently removed.`
        }
        confirmLabel={
          confirmAction?.kind === "clear" ? "Clear inbox" : "Delete message"
        }
        destructive
        pending={clearInbox.isPending || removeMessage.isPending}
        onConfirm={() => {
          if (confirmAction?.kind === "clear") clearInbox.mutate();
          if (confirmAction?.kind === "delete")
            removeMessage.mutate({ id: confirmAction.id });
        }}
      />
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
        >
          <div className="size-9 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-3.5 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
