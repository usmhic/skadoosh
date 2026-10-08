"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { Avatar, AvatarFallback, AvatarImage } from "@skaddosh/ui/components/ui/avatar";
import { Button } from "@skaddosh/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@skaddosh/ui/components/ui/dialog";
import { Input } from "@skaddosh/ui/components/ui/input";
import { Label } from "@skaddosh/ui/components/ui/label";
import { ArrowUpRightIcon, Loader2Icon } from "lucide-react";
import { ActionError } from "@/components/action-error";
import { VerifiedBadge, initials } from "@/components/kudos/kudos-ui";

const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

export function ContributorsSection({
  projectId,
  creator,
  isOwner,
}: {
  projectId: string;
  creator: { name: string; username: string | null; image: string | null; verified?: boolean };
  isOwner: boolean;
}) {
  const utils = trpc.useUtils();
  const list = trpc.contributors.list.useQuery({ projectId });
  const [agreementId, setAgreementId] = useState<string | null>(null);
  const respond = trpc.contributors.respond.useMutation({ onSuccess: () => utils.contributors.list.invalidate({ projectId }) });
  const remove = trpc.contributors.remove.useMutation({ onSuccess: () => utils.contributors.list.invalidate({ projectId }) });
  const data = list.data;
  if (!data) return null;

  return (
    <section id="contributors" className="scroll-mt-24">
      <h2 className="font-display text-4xl tracking-tight">People behind it</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        Every credit and revenue share here was agreed by both people. Shares apply to what the project earns in Kudos.
      </p>

      <ul className="mt-6 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-card">
        <li className="flex items-center gap-4 p-4">
          <Person person={creator} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{creator.name}</p>
            <p className="text-xs text-muted-foreground">Creator</p>
          </div>
          <span className="text-sm font-semibold tabular-nums">{pct(data.creatorKeepsBps)}</span>
        </li>
        {data.contributors.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-4 p-4">
            <Person person={c.person} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-medium">
                <Link href={`/${c.person.username ?? ""}`} className="hover:underline">
                  {c.person.name}
                </Link>
                <VerifiedBadge verified={c.person.verified} />
              </p>
              <p className="text-xs text-muted-foreground">
                {c.role}
                {c.coOwner ? " · co-owner" : ""}
                {c.contribution ? ` · ${c.contribution}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <button className="text-muted-foreground underline-offset-2 hover:underline" onClick={() => setAgreementId(c.id)}>
                Agreement
              </button>
              {c.attestation?.explorerUrl ? (
                <a href={c.attestation.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-muted-foreground hover:text-foreground">
                  On record <ArrowUpRightIcon className="size-3" />
                </a>
              ) : null}
              <span className="w-12 text-right text-sm font-semibold tabular-nums">{c.splitBps ? pct(c.splitBps) : "Credit"}</span>
              {isOwner || c.isViewer ? (
                <button className="text-muted-foreground hover:text-destructive" disabled={remove.isPending} onClick={() => remove.mutate({ id: c.id })}>
                  End
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {data.pending.length ? (
        <div className="mt-4 space-y-2">
          {data.pending.map((p) => {
            const waitingOnViewer = (p.initiatedBy === "creator" && p.isViewer) || (p.initiatedBy === "contributor" && isOwner);
            return (
              <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-border p-4 text-sm">
                <Person person={p.person} />
                <div className="min-w-0 flex-1">
                  <p>
                    <span className="font-medium">{p.person.name}</span> · {p.role} · {p.splitBps ? pct(p.splitBps) : "credit only"}
                    {p.coOwner ? " · co-owner" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.initiatedBy === "creator" ? "Invited by the creator" : "Offered to contribute"} ·{" "}
                    {waitingOnViewer ? "waiting for you" : "waiting for the other person"}
                  </p>
                </div>
                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setAgreementId(p.id)}>
                  Read agreement
                </Button>
                {waitingOnViewer ? (
                  <>
                    <Button size="sm" variant="outline" className="rounded-full" disabled={respond.isPending} onClick={() => respond.mutate({ id: p.id, accept: false })}>
                      Decline
                    </Button>
                    <Button size="sm" className="rounded-full" disabled={respond.isPending} onClick={() => respond.mutate({ id: p.id, accept: true })}>
                      Accept
                    </Button>
                  </>
                ) : null}
              </div>
            );
          })}
          <ActionError error={respond.error} />
        </div>
      ) : null}

      {agreementId ? <AgreementDialog id={agreementId} onClose={() => setAgreementId(null)} /> : null}
    </section>
  );
}

function Person({ person }: { person: { name: string; image?: string | null } }) {
  return (
    <Avatar className="size-9">
      {person.image ? <AvatarImage src={person.image} alt="" className="object-cover" /> : null}
      <AvatarFallback className="text-xs font-semibold">{initials(person.name)}</AvatarFallback>
    </Avatar>
  );
}

function AgreementDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const agreement = trpc.contributors.agreement.useQuery({ id });
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal">Contributor agreement</DialogTitle>
          <DialogDescription>Both people accept this exact text. Its fingerprint is recorded so it can&apos;t change later.</DialogDescription>
        </DialogHeader>
        {agreement.data ? (
          <>
            <pre className="max-h-80 overflow-y-auto whitespace-pre-wrap rounded-2xl border border-border bg-muted/40 p-4 font-serif text-sm leading-6">
              {agreement.data.text}
            </pre>
            <p className="break-all font-mono text-[0.68rem] text-muted-foreground">SHA-256 {agreement.data.hash}</p>
          </>
        ) : (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Someone offers their skills to a project. The creator accepts, and only then does anything apply. */
export function ContributeDialog({
  projectId,
  defaultRole,
  open,
  onOpenChange,
}: {
  projectId: string;
  defaultRole?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [role, setRole] = useState(defaultRole ?? "");
  const [contribution, setContribution] = useState("");
  const [share, setShare] = useState(0);
  const [coOwner, setCoOwner] = useState(false);
  const request = trpc.contributors.request.useMutation({
    onSuccess: () => utils.contributors.list.invalidate({ projectId }),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) request.reset();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal">Offer to contribute</DialogTitle>
          <DialogDescription>
            Describe what you&apos;d do. If the creator accepts, you&apos;re credited on the project, and any share you agree on is
            paid automatically from what it earns.
          </DialogDescription>
        </DialogHeader>
        {request.isSuccess ? (
          <p className="rounded-2xl bg-muted p-4 text-sm">
            Sent. The creator can read your offer and the agreement text, then accept or decline. You&apos;ll see their answer on
            this page.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contrib-role">Your role</Label>
              <Input id="contrib-role" value={role} maxLength={80} onChange={(e) => setRole(e.target.value)} placeholder="Illustrator, translator, sound designer…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contrib-what">What you&apos;ll contribute</Label>
              <textarea
                id="contrib-what"
                rows={3}
                maxLength={600}
                value={contribution}
                onChange={(e) => setContribution(e.target.value)}
                className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm"
                placeholder="Twelve ink plates for the chapter openings."
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="contrib-share">Revenue share you&apos;re asking for</Label>
                <span className="text-sm font-semibold tabular-nums">{share === 0 ? "Credit only" : `${share}%`}</span>
              </div>
              <input id="contrib-share" type="range" min={0} max={50} value={share} onChange={(e) => setShare(Number(e.target.value))} className="w-full accent-[var(--foreground)]" />
              <p className="text-xs text-muted-foreground">A share of the creator&apos;s side of what the project earns. Leave it at 0 for credit only.</p>
            </div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" checked={coOwner} onChange={(e) => setCoOwner(e.target.checked)} className="mt-1" />
              <span>Co-own the copyright in my contribution (formal transfers may also need a signed document).</span>
            </label>
            <ActionError error={request.error} />
          </div>
        )}
        <DialogFooter>
          {request.isSuccess ? (
            <Button className="rounded-full" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          ) : (
            <Button
              className="rounded-full"
              disabled={!role.trim() || request.isPending}
              onClick={() => request.mutate({ projectId, role: role.trim(), contribution: contribution.trim(), splitBps: share * 100, coOwner })}
            >
              {request.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
              Send offer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
