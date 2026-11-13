"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { BadgeCheckIcon, FileBadgeIcon, HandshakeIcon } from "lucide-react";
import { ActionError } from "@/components/action-error";
import { KudosMark, timeAgo } from "@/components/kudos/kudos-ui";

const pct = (bps: number) => (bps ? `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%` : "credit only");

/** Things waiting on the creator: verification, collaboration offers, and invitations. */
export function StudioInbox() {
  const utils = trpc.useUtils();
  const identity = trpc.identity.status.useQuery();
  const collab = trpc.contributors.mine.useQuery();
  const respond = trpc.contributors.respond.useMutation({
    onSuccess: () => Promise.all([utils.contributors.mine.invalidate(), utils.contributors.list.invalidate()]),
  });

  const requests = collab.data?.requests ?? [];
  const invitations = collab.data?.contributions.filter((c) => c.awaitingMe) ?? [];
  const needsVerify = identity.data?.enforced && identity.data.status !== "verified";
  if (!needsVerify && requests.length === 0 && invitations.length === 0) return null;

  return (
    <section className="mb-6 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-2xl">Needs you</h2>
      <ul className="mt-4 space-y-3">
        {needsVerify ? (
          <li className="flex flex-wrap items-center gap-3 rounded-2xl bg-muted/60 p-4 text-sm">
            <BadgeCheckIcon className="size-5 text-verified" />
            <span className="min-w-0 flex-1">
              {identity.data?.status === "pending"
                ? "Your verification is being checked. It usually takes a few minutes."
                : "Verify your identity to publish, sell licences, and invite collaborators."}
            </span>
            {identity.data?.status !== "pending" ? (
              <Button asChild size="sm" className="rounded-full">
                <Link href="/welcome?step=verify">Verify</Link>
              </Button>
            ) : null}
          </li>
        ) : null}
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4 text-sm">
            <HandshakeIcon className="size-5 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="font-medium">{r.person.name}</span> wants to join{" "}
              <Link href={`/projects/${r.project.id}#contributors`} className="font-medium underline-offset-2 hover:underline">
                {r.project.title}
              </Link>{" "}
              as {r.role} · {pct(r.splitBps)}
              {r.coOwner ? " · co-owner" : ""}
              {r.contribution ? <span className="mt-0.5 block text-xs text-muted-foreground">{r.contribution}</span> : null}
            </span>
            <Button size="sm" variant="outline" className="rounded-full" disabled={respond.isPending} onClick={() => respond.mutate({ id: r.id, accept: false })}>
              Decline
            </Button>
            <Button size="sm" className="rounded-full" disabled={respond.isPending} onClick={() => respond.mutate({ id: r.id, accept: true })}>
              Accept
            </Button>
          </li>
        ))}
        {invitations.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-border p-4 text-sm">
            <HandshakeIcon className="size-5 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              You&apos;re invited to{" "}
              <Link href={`/projects/${c.project.id}#contributors`} className="font-medium underline-offset-2 hover:underline">
                {c.project.title}
              </Link>{" "}
              as {c.role} · {pct(c.splitBps)}
            </span>
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <Link href={`/projects/${c.project.id}#contributors`}>Read agreement</Link>
            </Button>
            <Button size="sm" className="rounded-full" disabled={respond.isPending} onClick={() => respond.mutate({ id: c.id, accept: true })}>
              Accept
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <ActionError error={respond.error} />
      </div>
    </section>
  );
}

export function LicensesSold() {
  const sold = trpc.licenses.sold.useQuery();
  if (!sold.data?.length) return null;
  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
          <FileBadgeIcon className="size-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold">Licences sold</p>
          <p className="text-xs text-muted-foreground">{sold.data.length} so far</p>
        </div>
      </div>
      <ul className="divide-y divide-border/60">
        {sold.data.slice(0, 8).map((l) => (
          <li key={l.certificateCode}>
            <Link href={`/licenses/${l.certificateCode}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-muted/40">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{l.projectTitle}</span>
                <span className="block text-xs capitalize text-muted-foreground">
                  {l.tier} · {l.licenseeName} · {timeAgo(l.createdAt)}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 tabular-nums">
                <KudosMark size="xs" /> {l.priceKudos - l.platformFeeKudos}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
