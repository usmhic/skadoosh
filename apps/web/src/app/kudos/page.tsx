"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { cn } from "@skaddosh/ui/lib/utils";
import { CreditCardIcon, GiftIcon, Loader2Icon } from "lucide-react";
import { KUDOS } from "@skaddosh/api/kudos";
import { KudosFlow } from "@/components/discovery/discover-home";
import { KudosAmount, KudosMark, StageBadge, timeAgo } from "@/components/kudos/kudos-ui";

const LEDGER_LABEL: Record<string, string> = {
  opening_balance: "Opening balance",
  signup_grant: "Welcome Kudos",
  weekly_allowance: "Weekly allowance",
  purchase: "Bought a pack",
  give: "Gave Kudos",
  receive: "Received Kudos",
  back: "Backed a project",
  release: "Released at a milestone",
  return: "Return from a project you backed",
  refund: "Thawed back to you",
  unlock_spend: "Unlocked work",
  unlock_earn: "Someone unlocked your work",
  comment: "Comment",
};

export default function KudosPage() {
  const { data: session, isPending } = useSession();

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Kudos</p>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">Support that travels with the work</h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground">
          Hot Kudos are for giving. Cold Kudos are what you&apos;ve committed to projects you believe in.
        </p>
      </header>

      {isPending ? null : session ? <Wallet /> : <SignedOut />}
      <HowItWorks />
    </div>
  );
}

function SignedOut() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-4 rounded-3xl border border-border bg-card p-6">
      <KudosMark temp="hot" size="lg" />
      <p className="mr-auto max-w-md text-sm leading-6 text-muted-foreground">
        Every new member starts with {KUDOS.SIGNUP_GRANT} Hot Kudos, plus {KUDOS.WEEKLY_ALLOWANCE} more each week to give away.
      </p>
      <Button asChild className="rounded-full">
        <Link href="/auth/signup">Join and get {KUDOS.SIGNUP_GRANT} Kudos</Link>
      </Button>
    </div>
  );
}

function Wallet() {
  const utils = trpc.useUtils();
  const wallet = trpc.kudos.wallet.useQuery();
  const backings = trpc.kudos.backings.useQuery();
  const history = trpc.kudos.history.useQuery({ limit: 40 });
  const claim = trpc.kudos.claimWeekly.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.kudos.wallet.invalidate(), utils.kudos.history.invalidate(), utils.users.me.invalidate()]);
    },
  });
  const w = wallet.data;

  return (
    <div className="mt-8 space-y-10">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hot */}
        <div className="flex flex-col rounded-3xl border border-hot/25 bg-hot-soft/50 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-hot">
            <KudosMark temp="hot" /> Hot Kudos
          </div>
          <p className="mt-3 font-display text-5xl font-semibold tabular-nums">{w?.hot ?? "–"}</p>
          <p className="mt-1 text-sm text-muted-foreground">Ready to give, back with, or unlock work.</p>
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button
              className="rounded-full bg-hot text-hot-foreground hover:bg-hot/90"
              disabled={!w?.allowance.claimable || claim.isPending}
              onClick={() => claim.mutate()}
            >
              {claim.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <GiftIcon className="size-4" />}
              Claim weekly {w?.allowance.amount ?? KUDOS.WEEKLY_ALLOWANCE}
            </Button>
            <BuyPack />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {w?.allowance.claimable
              ? "Your weekly allowance is ready. It's for giving to other creators."
              : w?.allowance.reason === "too_soon" && w.allowance.nextClaimAt
                ? `Next allowance ${new Date(w.allowance.nextClaimAt).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}.`
                : `The allowance pauses while you hold ${KUDOS.WEEKLY_ALLOWANCE_BALANCE_CEILING}+ Hot Kudos.`}
          </p>
          {claim.error ? <p className="mt-2 text-xs text-destructive">{claim.error.message}</p> : null}
        </div>

        {/* Cold */}
        <div className="flex flex-col rounded-3xl border border-cold/25 bg-cold-soft/50 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-cold">
            <KudosMark temp="cold" /> Cold Kudos
          </div>
          <p className="mt-3 font-display text-5xl font-semibold tabular-nums">{w?.cold ?? "–"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Still locked in {w?.backedProjects ?? 0} project{w?.backedProjects === 1 ? "" : "s"}, waiting for milestones.
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-background/70 p-3">
              <dd className="font-display text-xl font-semibold tabular-nums">{w?.committed ?? 0}</dd>
              <dt className="text-xs text-muted-foreground">committed in total</dt>
            </div>
            <div className="rounded-2xl bg-background/70 p-3">
              <dd className="font-display text-xl font-semibold tabular-nums">{w?.returnsEarned ?? 0}</dd>
              <dt className="text-xs text-muted-foreground">returned to you as Hot</dt>
            </div>
          </dl>
        </div>
      </div>

      {w && (w.creatorEarnings.received > 0 || w.creatorEarnings.released > 0) ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-border bg-card px-5 py-4 text-sm">
          <span className="font-semibold">As a creator</span>
          <KudosAmount temp="hot" value={w.creatorEarnings.received} label="received from supporters" />
          <KudosAmount temp="cold" value={w.creatorEarnings.released} label="released by backers" />
        </div>
      ) : null}

      <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight">Projects you believe in</h2>
        {backings.data?.length ? (
          <ul className="mt-5 grid gap-3">
            {backings.data.map((b) => {
              const returnedPct = b.returnCap ? Math.min(100, Math.round((b.returned / b.returnCap) * 100)) : 0;
              return (
                <li key={b.project.id}>
                  <Link
                    href={`/projects/${b.project.id}`}
                    className="grid gap-4 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-foreground/20 sm:grid-cols-[1fr_auto]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">{b.project.title}</span>
                        <StageBadge stage={b.project.stage} />
                        <span className="font-mono text-xs text-muted-foreground">
                          #{b.backerNumber}
                          {b.earlyBeliever ? " · early believer" : ""}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">by {b.creator.name}</p>
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-hot-soft" title="Returns received toward your cap">
                        <div className="h-full rounded-full bg-hot" style={{ width: `${returnedPct}%` }} />
                      </div>
                      <p className="mt-1 text-[0.7rem] text-muted-foreground">
                        {b.returned} of {b.returnCap} possible returns
                      </p>
                    </div>
                    <dl className="grid grid-cols-3 gap-4 text-right text-sm sm:min-w-72">
                      <div>
                        <dd className="font-semibold tabular-nums">{b.amount}</dd>
                        <dt className="text-[0.7rem] text-muted-foreground">committed</dt>
                      </div>
                      <div>
                        <dd className="font-semibold tabular-nums text-cold">{b.locked}</dd>
                        <dt className="text-[0.7rem] text-muted-foreground">locked</dt>
                      </div>
                      <div>
                        <dd className="font-semibold tabular-nums">{b.released}</dd>
                        <dt className="text-[0.7rem] text-muted-foreground">released</dt>
                      </div>
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
            You haven&apos;t backed anything yet.{" "}
            <Link href="/?mode=backing" className="font-medium text-foreground underline underline-offset-2">
              Find a project in its early days
            </Link>
            .
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold tracking-tight">History</h2>
        <p className="mt-1 text-sm text-muted-foreground">Every Kudo that moved, and why.</p>
        <ul className="mt-5 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {history.data?.map((h) => (
            <li key={h.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <KudosMark temp={h.currency} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate">
                  {LEDGER_LABEL[h.kind] ?? h.kind}
                  {h.project ? (
                    <>
                      {" · "}
                      <Link href={`/projects/${h.project.id}`} className="font-medium hover:underline">
                        {h.project.title}
                      </Link>
                    </>
                  ) : h.work ? (
                    <>
                      {" · "}
                      <Link href={`/read/${h.work.id}`} className="font-medium hover:underline">
                        {h.work.title}
                      </Link>
                    </>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {h.counterparty ? `${h.counterparty.name} · ` : ""}
                  {timeAgo(h.createdAt)}
                </p>
              </div>
              <span
                className={cn(
                  "font-mono font-semibold tabular-nums",
                  h.delta > 0 ? (h.currency === "hot" ? "text-hot" : "text-cold") : "text-muted-foreground",
                )}
              >
                {h.delta > 0 ? "+" : "−"}
                {Math.abs(h.delta)}
              </span>
            </li>
          ))}
          {history.data?.length === 0 ? <li className="px-4 py-6 text-sm text-muted-foreground">No movements yet.</li> : null}
        </ul>
      </section>
    </div>
  );
}

function BuyPack() {
  const [pending, setPending] = useState<number | null>(null);
  const [error, setError] = useState("");
  const buy = async (amount: number) => {
    setPending(amount);
    setError("");
    try {
      const response = await fetch("/api/billing/kudos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url) throw new Error(payload.error ?? "Unable to open checkout.");
      window.location.assign(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open checkout.");
      setPending(null);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="ml-1 text-xs text-muted-foreground">
        <CreditCardIcon className="mr-1 inline size-3.5" />
        Buy
      </span>
      {[25, 100, 250].map((amount) => (
        <Button
          key={amount}
          size="sm"
          variant="outline"
          className="h-8 rounded-full bg-background/70 px-3 tabular-nums"
          disabled={pending !== null}
          onClick={() => void buy(amount)}
        >
          {pending === amount ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
          {amount}
        </Button>
      ))}
      {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function HowItWorks() {
  const rules = [
    ["Welcome", `${KUDOS.SIGNUP_GRANT} Hot Kudos when you join`],
    ["Weekly allowance", `${KUDOS.WEEKLY_ALLOWANCE} Hot every week while you hold under ${KUDOS.WEEKLY_ALLOWANCE_BALANCE_CEILING}`],
    ["Give", `${KUDOS.GIVE_MIN}–${KUDOS.GIVE_MAX} Kudos per piece or project, straight to the creator`],
    ["Back", `${KUDOS.BACKING_MIN}–${KUDOS.BACKING_MAX} Kudos into a project in Idea (1.5×) or Making (1.25×)`],
    ["Release", "Cold Kudos reach the creator as milestones are delivered"],
    ["Return", `Backers share up to ${KUDOS.BACKER_SHARE_MAX_PERCENT}% of a project's Kudos, capped at ${KUDOS.RETURN_CAP_MIN_PERCENT / 100}–${KUDOS.RETURN_CAP_MAX_PERCENT / 100}× what they put in`],
    ["Thaw", "Withdraw within 48 hours, or get everything unreleased back if a project is cancelled"],
  ];
  return (
    <section id="how" className="mt-16 scroll-mt-24 border-t border-border pt-12">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight">How Kudos work</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Kudos are a community currency, not an investment. They only exist on skaddosh, they can&apos;t be traded or cashed out
            by supporters, and returns are a capped thank-you paid in Kudos. Nobody can pay to get to the top of Discover.
          </p>
          <dl className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
            {rules.map(([term, body]) => (
              <div key={term} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-3 text-sm">
                <dt className="font-semibold">{term}</dt>
                <dd className="text-muted-foreground">{body}</dd>
              </div>
            ))}
          </dl>
        </div>
        <KudosFlow />
      </div>
    </section>
  );
}
