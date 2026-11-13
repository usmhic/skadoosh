"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Input } from "@skaddosh/ui/components/ui/input";
import { Label } from "@skaddosh/ui/components/ui/label";
import { cn } from "@skaddosh/ui/lib/utils";
import { CheckIcon, Loader2Icon, LockIcon, ShieldCheckIcon, TrashIcon } from "lucide-react";
import { ActionError } from "@/components/action-error";
import { VerifiedBadge } from "@/components/kudos/kudos-ui";
import { MEDIUM_INFO } from "@/lib/mediums";
import type { Medium } from "@skaddosh/db/schema";

const STEPS = ["you", "make", "verify"] as const;
type Step = (typeof STEPS)[number];

export default function WelcomePage() {
  return (
    <Suspense>
      <Welcome />
    </Suspense>
  );
}

function Welcome() {
  const params = useSearchParams();
  const router = useRouter();
  const requested = params.get("step") as Step | null;
  const [step, setStep] = useState<Step>(requested && STEPS.includes(requested) ? requested : "you");
  const go = (next: Step) => {
    setStep(next);
    router.replace(`/welcome?step=${next}`, { scroll: false });
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:py-20">
      <ol className="mb-10 flex gap-2" aria-label="Setup steps">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("h-1 flex-1 rounded-full", STEPS.indexOf(step) >= i ? "bg-foreground" : "bg-muted")} />
        ))}
      </ol>
      {step === "you" ? <YouStep onNext={() => go("make")} /> : null}
      {step === "make" ? <MakeStep onNext={() => go("verify")} /> : null}
      {step === "verify" ? <VerifyStep /> : null}
    </div>
  );
}

function YouStep({ onNext }: { onNext: () => void }) {
  const me = trpc.users.me.useQuery();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  useEffect(() => {
    if (!me.data) return;
    setName(me.data.user.name ?? "");
    setUsername(me.data.user.username ?? "");
    setBio(me.data.user.bio ?? "");
  }, [me.data]);
  const save = trpc.users.updateProfile.useMutation({ onSuccess: onNext });

  return (
    <section>
      <h1 className="font-display text-5xl leading-none tracking-tight">Welcome to skaddosh.</h1>
      <p className="mt-4 text-muted-foreground">Let&apos;s set up your gallery. It takes about two minutes.</p>
      <div className="mt-10 space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="w-name">Your name</Label>
          <Input id="w-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-username">Username</Label>
          <div className="flex items-center rounded-lg border border-input bg-background pl-3 text-sm focus-within:ring-2 focus-within:ring-ring/30">
            <span className="text-muted-foreground">skaddosh/</span>
            <input
              id="w-username"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
              maxLength={32}
              className="h-9 min-w-0 flex-1 bg-transparent px-1 outline-none"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-bio">One line about you (optional)</Label>
          <Input id="w-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={300} placeholder="Illustrator drawing maps of places that remember." />
        </div>
        <ActionError error={save.error} />
        <Button
          size="lg"
          className="h-12 w-full rounded-full"
          disabled={!name.trim() || username.length < 2 || save.isPending}
          onClick={() => save.mutate({ name: name.trim(), username, bio: bio.trim() })}
        >
          {save.isPending ? <Loader2Icon className="size-4 animate-spin" /> : null}
          Continue
        </Button>
      </div>
    </section>
  );
}

function MakeStep({ onNext }: { onNext: () => void }) {
  const settings = trpc.users.getSettings.useQuery();
  const [picked, setPicked] = useState<string[]>([]);
  useEffect(() => {
    try {
      setPicked(JSON.parse(settings.data?.contentCategories ?? "[]") as string[]);
    } catch {
      setPicked([]);
    }
  }, [settings.data]);
  const save = trpc.users.updateSettings.useMutation({ onSuccess: onNext });
  const mediums = (Object.keys(MEDIUM_INFO) as Medium[]).filter((m) => m !== "other");

  return (
    <section>
      <h1 className="font-display text-5xl leading-none tracking-tight">What do you make, or love?</h1>
      <p className="mt-4 text-muted-foreground">We&apos;ll tune your gallery to it. Pick as many as you like.</p>
      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {mediums.map((m) => {
          const Icon = MEDIUM_INFO[m].icon;
          const on = picked.includes(m);
          return (
            <button
              key={m}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(on ? picked.filter((p) => p !== m) : [...picked, m])}
              className={cn(
                "flex h-24 flex-col items-start justify-between rounded-2xl border p-4 text-left text-sm transition-colors",
                on ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/30",
              )}
            >
              <Icon className="size-5" />
              {MEDIUM_INFO[m].label}
            </button>
          );
        })}
      </div>
      <Button
        size="lg"
        className="mt-8 h-12 w-full rounded-full"
        disabled={save.isPending}
        onClick={() => save.mutate({ contentCategories: picked.slice(0, 12) })}
      >
        Continue
      </Button>
    </section>
  );
}

function VerifyStep() {
  const router = useRouter();
  const returned = useSearchParams().get("returned") === "1";
  const status = trpc.identity.status.useQuery(undefined, { refetchInterval: (q) => (q.state.data?.status === "pending" ? 4000 : false) });
  const start = trpc.identity.start.useMutation({ onSuccess: (r) => window.location.assign(r.url) });
  const finish = trpc.users.completeOnboarding.useMutation({ onSuccess: () => router.push("/studio") });
  const data = status.data;

  return (
    <section>
      <ShieldCheckIcon className="size-8 text-verified" />
      <h1 className="mt-5 font-display text-5xl leading-none tracking-tight">Show you&apos;re a real person.</h1>
      <p className="mt-4 text-muted-foreground">
        skaddosh is for original work made by people. Verifying lets you publish projects, sell licences, and share in
        revenue with collaborators. Exploring and giving Kudos never needs it.
      </p>

      <ul className="mt-8 space-y-3 text-sm">
        {[
          "Our verification partner checks a photo ID and a quick selfie. It takes about two minutes.",
          "We never see or store your document or photo. We only keep the result and the country that issued the ID.",
          "Your profile shows a small Verified mark. Your identity details are never shown to anyone.",
        ].map((line) => (
          <li key={line} className="flex gap-3">
            <LockIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {line}
          </li>
        ))}
      </ul>

      <div className="mt-10 rounded-3xl border border-border bg-card p-6">
        {status.isLoading ? (
          <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
        ) : !data?.provider ? (
          <p className="text-sm text-muted-foreground">Verification isn&apos;t switched on for this skaddosh yet, so you can skip this step.</p>
        ) : data.status === "verified" ? (
          <p className="flex items-center gap-2 text-sm font-medium">
            <VerifiedBadge verified label /> You&apos;re verified. Thank you.
          </p>
        ) : data.status === "pending" ? (
          <p className="flex items-center gap-2 text-sm">
            <Loader2Icon className="size-4 animate-spin" />
            {returned ? "Thanks! We're waiting for the result. This page updates by itself." : "Verification in progress."}
          </p>
        ) : (
          <>
            {data.status === "rejected" ? (
              <p className="mb-4 text-sm text-destructive">
                We couldn&apos;t verify that attempt. You can try again with a different ID, or contact support.
              </p>
            ) : null}
            <Button size="lg" className="h-12 w-full rounded-full" disabled={start.isPending} onClick={() => start.mutate()}>
              {start.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <CheckIcon className="size-4" />}
              Verify my identity
            </Button>
            <ActionError error={start.error} />
          </>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-4">
        {data?.status !== "verified" ? (
          <button className="text-sm text-muted-foreground underline-offset-2 hover:underline" onClick={() => finish.mutate()}>
            I&apos;ll do this later
          </button>
        ) : (
          <span />
        )}
        <Button size="lg" className="h-12 rounded-full px-6" disabled={finish.isPending} onClick={() => finish.mutate()}>
          Go to my studio
        </Button>
      </div>
      <p className="mt-10 flex items-center gap-2 text-xs text-muted-foreground">
        <TrashIcon className="size-3.5" /> Deleting your account removes your verification record.
      </p>
    </section>
  );
}
