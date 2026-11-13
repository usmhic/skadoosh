"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Input } from "@skaddosh/ui/components/ui/input";
import { Label } from "@skaddosh/ui/components/ui/label";
import { cn } from "@skaddosh/ui/lib/utils";
import type { Medium } from "@skaddosh/db/schema";
import { CheckIcon, Loader2Icon, UserPlusIcon } from "lucide-react";
import { ActionError } from "@/components/action-error";
import { KudosMark } from "@/components/kudos/kudos-ui";
import { MEDIUM_INFO } from "@/lib/mediums";

const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 === 0 ? 0 : 1)}%`;

export function MediumPicker({ value, onChange }: { value: Medium; onChange: (medium: Medium) => void }) {
  return (
    <div className="space-y-2">
      <Label>Medium</Label>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Medium">
        {(Object.keys(MEDIUM_INFO) as Medium[]).map((medium) => {
          const { label, icon: Icon } = MEDIUM_INFO[medium];
          const active = value === medium;
          return (
            <button
              key={medium}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(medium)}
              className={cn(
                "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm transition-colors",
                active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const DEFAULT_PRICE: Record<string, number> = { personal: 10, commercial: 120, exclusive: 1500 };

/** Which licences are on sale and at what price. Saved separately from the rest of the editor. */
export function LicensingPanel({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const query = trpc.licenses.myOffers.useQuery({ projectId });
  const [draft, setDraft] = useState<Record<string, { priceKudos: number; active: boolean }>>({});
  const [savedAt, setSavedAt] = useState(0);
  const save = trpc.licenses.setOffers.useMutation({
    onSuccess: async () => {
      setSavedAt(Date.now());
      await Promise.all([utils.licenses.myOffers.invalidate({ projectId }), utils.licenses.offers.invalidate({ projectId })]);
    },
  });

  useEffect(() => {
    if (!query.data) return;
    setDraft(
      Object.fromEntries(
        query.data.tiers.map((t) => [t.tier, { priceKudos: t.priceKudos ?? DEFAULT_PRICE[t.tier] ?? 10, active: t.active }]),
      ),
    );
  }, [query.data]);

  if (!query.data) return null;
  const { tiers, exclusiveSold } = query.data;

  return (
    <div id="licensing" className="scroll-mt-24 space-y-4 border-t border-border pt-6">
      <div>
        <h2 className="font-display text-2xl">Licensing</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Let people buy permission to use this work. Terms are standard and plain; you keep ownership. skaddosh keeps a 10% fee
          and the rest is shared with your backers and collaborators as agreed.
        </p>
      </div>
      <div className="divide-y divide-border rounded-2xl border border-border">
        {tiers.map((tier) => {
          const row = draft[tier.tier] ?? { priceKudos: DEFAULT_PRICE[tier.tier] ?? 10, active: false };
          const closed = exclusiveSold && tier.tier !== "personal";
          return (
            <div key={tier.tier} className={cn("flex flex-wrap items-center gap-4 p-4", closed && "opacity-60")}>
              <label className="flex min-w-0 flex-1 items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={row.active && !closed}
                  disabled={closed}
                  onChange={(e) => setDraft({ ...draft, [tier.tier]: { ...row, active: e.target.checked } })}
                />
                <span>
                  <span className="block text-sm font-medium">{tier.label}</span>
                  <span className="block text-xs text-muted-foreground">{closed ? "Exclusive rights already sold." : tier.summary}</span>
                </span>
              </label>
              <div className="flex h-9 items-center gap-2 rounded-full border border-border px-3">
                <KudosMark size="xs" />
                <Input
                  type="number"
                  min={1}
                  value={row.priceKudos}
                  disabled={closed}
                  aria-label={`${tier.label} price`}
                  onChange={(e) =>
                    setDraft({ ...draft, [tier.tier]: { ...row, priceKudos: Math.max(1, Math.floor(Number(e.target.value) || 1)) } })
                  }
                  className="h-7 w-20 border-0 p-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </div>
          );
        })}
      </div>
      <ActionError error={save.error} />
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          disabled={save.isPending}
          onClick={() =>
            save.mutate({
              projectId,
              offers: tiers.map((t) => ({ tier: t.tier, ...(draft[t.tier] ?? { priceKudos: 10, active: false }) })),
            })
          }
        >
          {save.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Save licensing
        </Button>
        {savedAt && !save.isPending && !save.error ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CheckIcon className="size-3.5" /> Saved
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Invite collaborators with a role, a credit line, and an optional share of income. */
export function CollaboratorsPanel({ projectId, published }: { projectId: string; published: boolean }) {
  const utils = trpc.useUtils();
  const list = trpc.contributors.list.useQuery({ projectId });
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
  const [contribution, setContribution] = useState("");
  const [share, setShare] = useState(0);
  const [coOwner, setCoOwner] = useState(false);
  const refresh = () => utils.contributors.list.invalidate({ projectId });
  const invite = trpc.contributors.invite.useMutation({
    onSuccess: async () => {
      setUsername("");
      setRole("");
      setContribution("");
      setShare(0);
      setCoOwner(false);
      await refresh();
    },
  });
  const respond = trpc.contributors.respond.useMutation({ onSuccess: refresh });
  const remove = trpc.contributors.remove.useMutation({ onSuccess: refresh });
  const data = list.data;
  const committed = data ? 10_000 - data.creatorKeepsBps : 0;
  const maxShare = Math.max(0, Math.floor((9_000 - committed) / 100));

  return (
    <div className="space-y-4 border-t border-border pt-6">
      <div>
        <h2 className="font-display text-2xl">People behind it</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Credit collaborators and, if you agree, share what the project earns. Nothing applies until they accept the agreement.
          You always keep at least 10%.
        </p>
      </div>

      {data ? (
        <ul className="divide-y divide-border rounded-2xl border border-border text-sm">
          <li className="flex items-center justify-between p-3">
            <span>You</span>
            <span className="font-semibold tabular-nums">{pct(data.creatorKeepsBps)}</span>
          </li>
          {[...data.contributors, ...data.pending].map((c) => {
            const pending = c.status !== "accepted";
            const needsMe = pending && c.initiatedBy === "contributor";
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-3 p-3">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{c.person.name}</span> · {c.role}
                  {c.coOwner ? " · co-owner" : ""}
                  {pending ? (
                    <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {needsMe ? "wants to join" : "invited"}
                    </span>
                  ) : null}
                </span>
                <span className="tabular-nums">{c.splitBps ? pct(c.splitBps) : "Credit"}</span>
                {needsMe ? (
                  <>
                    <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => respond.mutate({ id: c.id, accept: false })}>
                      Decline
                    </Button>
                    <Button type="button" size="sm" className="rounded-full" onClick={() => respond.mutate({ id: c.id, accept: true })}>
                      Accept
                    </Button>
                  </>
                ) : (
                  <button type="button" className="text-xs text-muted-foreground hover:text-destructive" onClick={() => remove.mutate({ id: c.id })}>
                    {pending ? "Withdraw" : "End"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      <ActionError error={respond.error ?? remove.error} />

      {published ? (
        <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-user">Username</Label>
              <Input id="invite-user" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@hana" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Input id="invite-role" value={role} maxLength={80} onChange={(e) => setRole(e.target.value)} placeholder="Illustrator" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-what">What they contributed</Label>
            <Input id="invite-what" value={contribution} maxLength={600} onChange={(e) => setContribution(e.target.value)} placeholder="Cover art and chapter plates" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="invite-share">Share of income</Label>
              <span className="text-sm font-semibold tabular-nums">{share === 0 ? "Credit only" : `${share}%`}</span>
            </div>
            <input
              id="invite-share"
              type="range"
              min={0}
              max={maxShare}
              value={Math.min(share, maxShare)}
              onChange={(e) => setShare(Number(e.target.value))}
              className="w-full accent-[var(--foreground)]"
            />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={coOwner} onChange={(e) => setCoOwner(e.target.checked)} className="mt-1" />
            <span>They co-own the copyright in their contribution.</span>
          </label>
          <ActionError error={invite.error} />
          <Button
            type="button"
            className="rounded-full"
            disabled={!username.trim() || !role.trim() || invite.isPending}
            onClick={() =>
              invite.mutate({ projectId, username: username.trim(), role: role.trim(), contribution: contribution.trim(), splitBps: share * 100, coOwner })
            }
          >
            {invite.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <UserPlusIcon className="size-4" />}
            Send invitation
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Publish the project to invite collaborators.</p>
      )}
      <p className="text-xs text-muted-foreground">
        Both of you accept the same agreement text, and its fingerprint is recorded.{" "}
        <Link href="/how-it-works#contribute" className="underline underline-offset-2">
          How contributing works
        </Link>
      </p>
    </div>
  );
}
