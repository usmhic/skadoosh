"use client";

import { useState } from "react";
import Link from "next/link";
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
import { Loader2Icon } from "lucide-react";
import { KUDOS } from "@skaddosh/api/kudos";
import { KudosMark } from "./kudos-ui";

const GIVE_AMOUNTS = [1, 2, 3, 5];
const BACK_PRESETS = [10, 25, 50, 100];

function Amounts({
  values,
  value,
  onChange,
  temp,
}: {
  values: number[];
  value: number;
  onChange: (v: number) => void;
  temp: "hot" | "cold";
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "flex h-12 items-center justify-center gap-1.5 rounded-xl border text-sm font-semibold tabular-nums transition-colors",
            value === v
              ? temp === "hot"
                ? "border-hot bg-hot-soft text-hot"
                : "border-cold bg-cold-soft text-cold"
              : "border-border hover:border-foreground/30",
          )}
        >
          <KudosMark temp={temp} size="xs" />
          {v}
        </button>
      ))}
    </div>
  );
}

function Balance({ hot }: { hot: number | undefined }) {
  return (
    <p className="text-xs text-muted-foreground">
      You have <span className="font-semibold text-foreground tabular-nums">{hot ?? "…"}</span> Hot Kudos.{" "}
      <Link href="/kudos" className="underline underline-offset-2">
        Get more
      </Link>
    </p>
  );
}

export function GiveKudosDialog({
  open,
  onOpenChange,
  projectId,
  creatorName,
  backerSharePercent,
  hasBackers,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  creatorName: string;
  backerSharePercent: number;
  hasBackers: boolean;
}) {
  const utils = trpc.useUtils();
  const wallet = trpc.kudos.wallet.useQuery(undefined, { enabled: open });
  const [amount, setAmount] = useState(3);
  const [message, setMessage] = useState("");
  const give = trpc.projects.giveKudos.useMutation({
    onSuccess: async () => {
      setMessage("");
      onOpenChange(false);
      await Promise.all([utils.projects.publicById.invalidate({ id: projectId }), utils.kudos.wallet.invalidate()]);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Give Kudos</DialogTitle>
          <DialogDescription>
            {hasBackers && backerSharePercent > 0
              ? `${creatorName} receives your Kudos, and ${backerSharePercent}% goes to the people who backed this project early.`
              : `Your Kudos go straight to ${creatorName}, who can spend them supporting other creators.`}
          </DialogDescription>
        </DialogHeader>
        <Amounts values={GIVE_AMOUNTS} value={amount} onChange={setAmount} temp="hot" />
        <textarea
          rows={3}
          maxLength={280}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Say what you liked (optional)"
          className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
        />
        <Balance hot={wallet.data?.hot} />
        {give.error ? <p className="text-xs text-destructive">{give.error.message}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-hot text-hot-foreground hover:bg-hot/90"
            disabled={give.isPending}
            onClick={() => give.mutate({ projectId, amount, message: message.trim() || undefined })}
          >
            {give.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <KudosMark size="xs" className="bg-hot-foreground text-hot" />}
            Give {amount} Kudos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BackProjectDialog({
  open,
  onOpenChange,
  project,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    title: string;
    creatorName: string;
    stage: string;
    stageWeightPercent: number | null;
    backerSharePercent: number;
    returnCapPercent: number;
    hasMilestones: boolean;
  };
}) {
  const utils = trpc.useUtils();
  const wallet = trpc.kudos.wallet.useQuery(undefined, { enabled: open });
  const [amount, setAmount] = useState(25);
  const back = trpc.projects.back.useMutation({
    onSuccess: async () => {
      onOpenChange(false);
      await Promise.all([utils.projects.publicById.invalidate({ id: project.id }), utils.kudos.wallet.invalidate()]);
    },
  });

  const valid = Number.isInteger(amount) && amount >= KUDOS.BACKING_MIN && amount <= KUDOS.BACKING_MAX;
  const weight = (project.stageWeightPercent ?? 100) / 100;
  const cap = Math.floor((amount * project.returnCapPercent) / 100);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Back {project.title}</DialogTitle>
          <DialogDescription>
            Your Hot Kudos become Cold Kudos committed to this project.{" "}
            {project.hasMilestones
              ? `${project.creatorName} receives them milestone by milestone as the work is delivered.`
              : `${project.creatorName} receives them when the project is released.`}
          </DialogDescription>
        </DialogHeader>

        <Amounts values={BACK_PRESETS} value={amount} onChange={setAmount} temp="cold" />
        <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm">
          <span className="text-muted-foreground">Custom</span>
          <input
            type="number"
            inputMode="numeric"
            min={KUDOS.BACKING_MIN}
            max={KUDOS.BACKING_MAX}
            value={amount}
            onChange={(e) => setAmount(Math.floor(Number(e.target.value)))}
            className="w-full bg-transparent text-right font-semibold tabular-nums outline-none"
          />
          <KudosMark temp="cold" size="sm" />
        </label>

        <ul className="space-y-2 rounded-2xl bg-cold-soft/70 p-4 text-sm leading-6">
          <li>
            <span className="font-semibold">Early counts more.</span> Backing during {project.stage === "idea" ? "Idea" : "Making"} weighs{" "}
            {weight}× when returns are shared.
          </li>
          <li>
            <span className="font-semibold">You share in success.</span> Backers split {project.backerSharePercent}% of the Kudos this
            project earns. You can receive up to <span className="tabular-nums">{valid ? cap : "…"}</span> back.
          </li>
          <li>
            <span className="font-semibold">Safe if it stops.</span> Changed your mind? Withdraw within 48 hours. If the project is
            cancelled, anything not yet released comes back to you.
          </li>
        </ul>

        <Balance hot={wallet.data?.hot} />
        {!valid ? (
          <p className="text-xs text-destructive">
            Back with {KUDOS.BACKING_MIN}–{KUDOS.BACKING_MAX} Kudos.
          </p>
        ) : null}
        {back.error ? <p className="text-xs text-destructive">{back.error.message}</p> : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-cold text-cold-foreground hover:bg-cold/90"
            disabled={!valid || back.isPending}
            onClick={() => back.mutate({ projectId: project.id, amount })}
          >
            {back.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
            Back with {valid ? amount : "…"} Kudos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
