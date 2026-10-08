"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@skaddosh/ui/components/ui/dialog";
import { cn } from "@skaddosh/ui/lib/utils";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { ActionError } from "@/components/action-error";
import { KudosMark } from "@/components/kudos/kudos-ui";

type Tier = "personal" | "commercial" | "exclusive";

export function LicensesSection({
  projectId,
  isOwner,
  signedIn,
}: {
  projectId: string;
  isOwner: boolean;
  signedIn: boolean;
}) {
  const offers = trpc.licenses.offers.useQuery({ projectId });
  const [selected, setSelected] = useState<Tier | null>(null);
  const data = offers.data;

  if (!data || (data.offers.length === 0 && !isOwner)) return null;

  return (
    <section id="license" className="scroll-mt-24">
      <h2 className="font-display text-4xl tracking-tight">License this work</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
        A licence is permission to use the work, with plain terms and a certificate anyone can verify. It
        doesn&apos;t transfer ownership.
      </p>

      {data.offers.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
          You haven&apos;t put any licences on sale.{" "}
          <Link href={`/studio/projects/${projectId}#licensing`} className="font-medium text-foreground underline underline-offset-2">
            Set up licensing
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {data.offers.map((offer) => (
            <div
              key={offer.tier}
              className={cn(
                "flex flex-col rounded-3xl border bg-card p-6",
                offer.tier === "commercial" ? "border-foreground/30 shadow-sm" : "border-border",
              )}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-2xl">{offer.label}</h3>
                <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
                  <KudosMark size="xs" /> {offer.priceKudos.toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{offer.summary}</p>
              <ul className="mt-5 space-y-2 text-sm">
                {offer.allows.map((line) => (
                  <li key={line} className="flex gap-2">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-verified" /> {line}
                  </li>
                ))}
                {offer.forbids.map((line) => (
                  <li key={line} className="flex gap-2 text-muted-foreground">
                    <XIcon className="mt-0.5 size-4 shrink-0" /> {line}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-6">
                {isOwner ? (
                  <p className="text-xs text-muted-foreground">This is how buyers see your licence.</p>
                ) : signedIn ? (
                  <Button className="w-full rounded-full" variant={offer.tier === "commercial" ? "default" : "outline"} onClick={() => setSelected(offer.tier)}>
                    Get {offer.label} licence
                  </Button>
                ) : (
                  <Button asChild className="w-full rounded-full" variant="outline">
                    <Link href="/auth/login">Sign in to license</Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {data.exclusiveSold ? (
        <p className="mt-4 text-xs text-muted-foreground">Exclusive rights to this work have been sold, so only Personal licences remain.</p>
      ) : null}

      {selected ? (
        <BuyLicenseDialog
          projectId={projectId}
          tier={selected}
          offer={data.offers.find((o) => o.tier === selected)!}
          feePercent={data.platformFeePercent}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}

function BuyLicenseDialog({
  projectId,
  tier,
  offer,
  feePercent,
  onClose,
}: {
  projectId: string;
  tier: Tier;
  offer: { label: string; priceKudos: number };
  feePercent: number;
  onClose: () => void;
}) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const preview = trpc.licenses.preview.useQuery({ projectId, tier });
  const wallet = trpc.kudos.wallet.useQuery();
  const [agreed, setAgreed] = useState(false);
  const buy = trpc.licenses.buy.useMutation({
    onSuccess: async (result) => {
      await utils.kudos.wallet.invalidate();
      router.push(`/licenses/${result.certificateCode}?new=1`);
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-normal">{offer.label} licence</DialogTitle>
          <DialogDescription>
            {offer.priceKudos.toLocaleString()} Kudos. The creator receives it all except a {feePercent}% platform fee, shared
            with their backers and collaborators as agreed.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-72 overflow-y-auto rounded-2xl border border-border bg-muted/40 p-4">
          {preview.isLoading ? (
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <pre className="whitespace-pre-wrap font-serif text-sm leading-6">{preview.data?.text}</pre>
          )}
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
          <span>I&apos;ve read these terms and agree to them. The certificate number and date are filled in on purchase.</span>
        </label>
        <p className="text-xs text-muted-foreground">
          You have {wallet.data?.hot ?? "…"} Hot Kudos.{" "}
          <Link href="/kudos" className="underline underline-offset-2">
            Get more
          </Link>
        </p>
        <ActionError error={buy.error} />
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={onClose}>
            Cancel
          </Button>
          <Button className="rounded-full" disabled={!agreed || buy.isPending} onClick={() => buy.mutate({ projectId, tier })}>
            {buy.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <KudosMark size="xs" className="bg-background text-foreground" />}
            Buy for {offer.priceKudos.toLocaleString()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
