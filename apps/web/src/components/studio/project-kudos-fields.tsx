"use client";

import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Input } from "@skaddosh/ui/components/ui/input";
import { Label } from "@skaddosh/ui/components/ui/label";
import { cn } from "@skaddosh/ui/lib/utils";
import { CheckCircle2Icon, FlagIcon, Loader2Icon, PlusIcon, SendIcon, TrashIcon } from "lucide-react";
import { KUDOS } from "@skaddosh/api/kudos";
import { AI_USAGE_LABEL, KudosMark, StageBadge, stageLabel, type ProjectStage } from "@/components/kudos/kudos-ui";

// ── Backing terms (saved with the rest of the project form) ──────────────────

export type BackingTerms = {
  backingGoal: number;
  backerSharePercent: number;
  returnCapPercent: number;
};

export function BackingTermsFields({
  value,
  onChange,
  backersCount,
  locked,
}: {
  value: BackingTerms;
  onChange: (next: BackingTerms) => void;
  backersCount: number;
  /** Original terms; once people back, terms can only become more generous. */
  locked: BackingTerms;
}) {
  const hasBackers = backersCount > 0;
  return (
    <div className="space-y-5 rounded-2xl border border-cold/25 bg-cold-soft/40 p-5">
      <div className="flex items-start gap-3">
        <KudosMark temp="cold" size="md" />
        <div>
          <p className="text-sm font-semibold">Backing</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Supporters can back projects in Idea or Making with Cold Kudos. You receive them as you deliver milestones.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="backing-goal">Backing goal (Cold Kudos)</Label>
        <Input
          id="backing-goal"
          type="number"
          min={0}
          max={100000}
          value={value.backingGoal}
          onChange={(e) => onChange({ ...value, backingGoal: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
        />
        <p className="text-xs text-muted-foreground">Set to 0 if you aren&apos;t looking for backers right now.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="backer-share">Backer share</Label>
          <span className="text-sm font-semibold tabular-nums">{value.backerSharePercent}%</span>
        </div>
        <input
          id="backer-share"
          type="range"
          min={hasBackers ? locked.backerSharePercent : 0}
          max={KUDOS.BACKER_SHARE_MAX_PERCENT}
          value={value.backerSharePercent}
          onChange={(e) => onChange({ ...value, backerSharePercent: Number(e.target.value) })}
          className="w-full accent-[var(--cold)]"
        />
        <p className="text-xs text-muted-foreground">
          Share of every Kudo this project earns that goes back to its backers.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Return cap</Label>
        <div className="flex gap-2">
          {[100, 150, 200, 250, 300].map((cap) => (
            <button
              key={cap}
              type="button"
              disabled={hasBackers && cap < locked.returnCapPercent}
              onClick={() => onChange({ ...value, returnCapPercent: cap })}
              className={cn(
                "h-9 flex-1 rounded-lg border text-sm font-medium tabular-nums transition-colors disabled:opacity-40",
                value.returnCapPercent === cap ? "border-cold bg-cold text-cold-foreground" : "border-border bg-background",
              )}
            >
              {cap / 100}×
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Each backer stops earning returns once they&apos;ve received this multiple of what they put in.</p>
      </div>

      {hasBackers ? (
        <p className="rounded-xl bg-background/70 p-3 text-xs leading-5 text-muted-foreground">
          {backersCount} {backersCount === 1 ? "person has" : "people have"} backed under these terms, so the share and cap can only go up.
        </p>
      ) : null}
    </div>
  );
}

// ── Open roles ───────────────────────────────────────────────────────────────

export type OpenRole = { title: string; description: string };

export function OpenRolesField({ value, onChange }: { value: OpenRole[]; onChange: (next: OpenRole[]) => void }) {
  const update = (index: number, patch: Partial<OpenRole>) =>
    onChange(value.map((role, i) => (i === index ? { ...role, ...patch } : role)));
  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-semibold">Open roles</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">Looking for a collaborator? People can raise their hand and it lands in your inbox.</p>
      </div>
      {value.map((role, index) => (
        <div key={index} className="space-y-2 rounded-xl border border-border p-3">
          <div className="flex gap-2">
            <Input value={role.title} maxLength={80} placeholder="e.g. Illustrator for 12 plates" onChange={(e) => update(index, { title: e.target.value })} />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove role" onClick={() => onChange(value.filter((_, i) => i !== index))}>
              <TrashIcon className="size-4" />
            </Button>
          </div>
          <textarea
            value={role.description}
            maxLength={400}
            rows={2}
            placeholder="What you need, and what's in it for them"
            onChange={(e) => update(index, { description: e.target.value })}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </div>
      ))}
      {value.length < 8 ? (
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...value, { title: "", description: "" }])}>
          <PlusIcon className="size-3.5" /> Add a role
        </Button>
      ) : null}
    </div>
  );
}

// ── Made by humans ───────────────────────────────────────────────────────────

export function HumanMadeFields({
  aiUsage,
  onAiUsageChange,
  confirmed,
  onConfirmedChange,
}: {
  aiUsage: string[];
  onAiUsageChange: (next: string[]) => void;
  confirmed: boolean;
  onConfirmedChange: (next: boolean) => void;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border p-5">
      <div>
        <p className="text-sm font-semibold">Made by humans</p>
        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
          skaddosh is for original human work. AI can help with your process, but it can&apos;t be the work. Say what it helped with,
          and it will be shown on the project page.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(AI_USAGE_LABEL).map(([key, label]) => {
          const active = aiUsage.includes(key);
          return (
            <button
              key={key}
              type="button"
              aria-pressed={active}
              onClick={() => onAiUsageChange(active ? aiUsage.filter((u) => u !== key) : [...aiUsage, key])}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">{aiUsage.length ? "AI helped with the selected parts of the process." : "Nothing selected means no AI was used."}</p>
      <label className="flex items-start gap-3 rounded-xl bg-muted/60 p-3 text-sm">
        <input type="checkbox" checked={confirmed} onChange={(e) => onConfirmedChange(e.target.checked)} className="mt-1" />
        <span>I confirm this project is my own original work, and its core is made by people, not generated by AI.</span>
      </label>
    </div>
  );
}

// ── Lifecycle: stage, milestones, process log (saved immediately) ─────────────

type Milestone = {
  id: string;
  title: string;
  description: string;
  releasePercent: number;
  dueAt: Date | string | null;
  deliveredAt: Date | string | null;
};

const NEXT_STAGES: Record<ProjectStage, Array<{ stage: ProjectStage; label: string; explain: string }>> = {
  idea: [
    { stage: "making", label: "Start making", explain: "Backing stays open, now at 1.25×." },
    { stage: "released", label: "Mark released", explain: "Releases every remaining Cold Kudo to you and closes backing." },
    { stage: "cancelled", label: "Cancel project", explain: "Returns every unreleased Cold Kudo to its backer." },
  ],
  making: [
    { stage: "released", label: "Mark released", explain: "Releases every remaining Cold Kudo to you and closes backing." },
    { stage: "cancelled", label: "Cancel project", explain: "Returns every unreleased Cold Kudo to its backer." },
  ],
  released: [{ stage: "sustaining", label: "Move to sustaining", explain: "For projects that keep living and earning." }],
  sustaining: [],
  cancelled: [],
};

export function ProjectLifecycle({
  projectId,
  stage,
  milestones,
  published,
  onChanged,
}: {
  projectId: string;
  stage: ProjectStage;
  milestones: Milestone[];
  published: boolean;
  onChanged: () => void;
}) {
  const [confirming, setConfirming] = useState<ProjectStage | null>(null);
  const [note, setNote] = useState("");
  const setStage = trpc.projects.setStage.useMutation({
    onSuccess: () => {
      setConfirming(null);
      setNote("");
      onChanged();
    },
  });

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold">Stage</Label>
          <StageBadge stage={stage} />
        </div>
        {NEXT_STAGES[stage].length ? (
          <div className="flex flex-wrap gap-2">
            {NEXT_STAGES[stage].map((next) => (
              <Button
                key={next.stage}
                type="button"
                size="sm"
                variant={next.stage === "cancelled" ? "ghost" : "outline"}
                className={cn(next.stage === "cancelled" && "text-destructive hover:text-destructive")}
                onClick={() => setConfirming(next.stage)}
              >
                {next.label}
              </Button>
            ))}
          </div>
        ) : null}
        {confirming ? (
          <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
            <p className="text-sm">
              <span className="font-semibold">{stageLabel(confirming)}:</span>{" "}
              {NEXT_STAGES[stage].find((n) => n.stage === confirming)?.explain}
            </p>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="A note for your backers (optional)"
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={confirming === "cancelled" ? "destructive" : "default"}
                disabled={setStage.isPending}
                onClick={() => setStage.mutate({ projectId, stage: confirming, note: note.trim() || undefined })}
              >
                {setStage.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
                Confirm
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(null)}>
                Not now
              </Button>
            </div>
            {setStage.error ? <p className="text-xs text-destructive">{setStage.error.message}</p> : null}
          </div>
        ) : null}
      </div>

      <MilestonesEditor projectId={projectId} milestones={milestones} disabled={stage === "cancelled"} onChanged={onChanged} />
      <ProcessComposer projectId={projectId} published={published} onChanged={onChanged} />
    </div>
  );
}

type DraftMilestone = { title: string; description: string; releasePercent: number; dueAt: string };

function toDateInput(value: Date | string | null) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

function MilestonesEditor({
  projectId,
  milestones,
  disabled,
  onChanged,
}: {
  projectId: string;
  milestones: Milestone[];
  disabled: boolean;
  onChanged: () => void;
}) {
  const delivered = milestones.filter((m) => m.deliveredAt);
  const [drafts, setDrafts] = useState<DraftMilestone[]>([]);
  const [deliverNotes, setDeliverNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts(
      milestones
        .filter((m) => !m.deliveredAt)
        .map((m) => ({ title: m.title, description: m.description, releasePercent: m.releasePercent, dueAt: toDateInput(m.dueAt) })),
    );
  }, [milestones]);

  const save = trpc.projects.setMilestones.useMutation({ onSuccess: onChanged });
  const deliver = trpc.projects.deliverMilestone.useMutation({ onSuccess: onChanged });
  const total = [...delivered, ...drafts].reduce((sum, m) => sum + (m.releasePercent || 0), 0);
  const patch = (i: number, p: Partial<DraftMilestone>) => setDrafts(drafts.map((d, j) => (j === i ? { ...d, ...p } : d)));

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <Label className="text-sm font-semibold">Milestones</Label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Each delivered milestone releases its share of Cold Kudos to you. Without milestones, everything releases when you mark the project released.
          </p>
        </div>
        <span className={cn("shrink-0 text-xs font-semibold tabular-nums", total > 100 ? "text-destructive" : "text-muted-foreground")}>
          {total}% planned
        </span>
      </div>

      {delivered.map((m) => (
        <div key={m.id} className="flex items-center gap-3 rounded-xl border border-cold/30 bg-cold-soft/40 p-3 text-sm">
          <CheckCircle2Icon className="size-4 shrink-0 text-cold" />
          <span className="flex-1 font-medium">{m.title}</span>
          <span className="tabular-nums text-muted-foreground">{m.releasePercent}%</span>
        </div>
      ))}

      {milestones
        .filter((m) => !m.deliveredAt)
        .map((m) => (
          <div key={m.id} className="space-y-2 rounded-xl border border-border p-3">
            <div className="flex items-center gap-2 text-sm">
              <FlagIcon className="size-4 text-muted-foreground" />
              <span className="flex-1 font-medium">{m.title}</span>
              <span className="tabular-nums text-muted-foreground">{m.releasePercent}%</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={deliverNotes[m.id] ?? ""}
                onChange={(e) => setDeliverNotes({ ...deliverNotes, [m.id]: e.target.value })}
                placeholder="What did you deliver? Backers will see this."
                disabled={disabled}
              />
              <Button
                type="button"
                size="sm"
                disabled={disabled || !deliverNotes[m.id]?.trim() || deliver.isPending}
                onClick={() => deliver.mutate({ milestoneId: m.id, note: deliverNotes[m.id]!.trim() })}
              >
                Deliver
              </Button>
            </div>
          </div>
        ))}
      {deliver.error ? <p className="text-xs text-destructive">{deliver.error.message}</p> : null}

      <div className="space-y-2 border-t border-dashed border-border pt-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan ahead</p>
        {drafts.map((d, i) => (
          <div key={i} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_6rem_9rem_auto]">
            <Input value={d.title} maxLength={120} placeholder="Milestone" onChange={(e) => patch(i, { title: e.target.value })} disabled={disabled} />
            <div className="relative">
              <Input
                type="number"
                min={0}
                max={100}
                value={d.releasePercent}
                onChange={(e) => patch(i, { releasePercent: Math.max(0, Math.min(100, Math.floor(Number(e.target.value) || 0))) })}
                className="pr-7"
                disabled={disabled}
                aria-label="Release percent"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
            <Input type="date" value={d.dueAt} onChange={(e) => patch(i, { dueAt: e.target.value })} disabled={disabled} aria-label="Planned date" />
            <Button type="button" variant="ghost" size="icon" aria-label="Remove milestone" onClick={() => setDrafts(drafts.filter((_, j) => j !== i))}>
              <TrashIcon className="size-4" />
            </Button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          {delivered.length + drafts.length < KUDOS.MAX_MILESTONES ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={disabled}
              onClick={() => setDrafts([...drafts, { title: "", description: "", releasePercent: Math.max(0, 100 - total), dueAt: "" }])}
            >
              <PlusIcon className="size-3.5" /> Add milestone
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            disabled={disabled || total > 100 || drafts.some((d) => !d.title.trim()) || save.isPending}
            onClick={() =>
              save.mutate({
                projectId,
                milestones: drafts.map((d) => ({
                  title: d.title.trim(),
                  description: d.description,
                  releasePercent: d.releasePercent,
                  dueAt: d.dueAt ? new Date(d.dueAt) : null,
                })),
              })
            }
          >
            {save.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
            Save plan
          </Button>
        </div>
        {save.error ? <p className="text-xs text-destructive">{save.error.message}</p> : null}
      </div>
    </div>
  );
}

function ProcessComposer({ projectId, published, onChanged }: { projectId: string; published: boolean; onChanged: () => void }) {
  const [body, setBody] = useState("");
  const post = trpc.projects.postUpdate.useMutation({
    onSuccess: () => {
      setBody("");
      onChanged();
    },
  });
  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Post to the process log</Label>
      <p className="text-xs text-muted-foreground">
        Sketches, drafts, decisions, setbacks. Followers and backers see these in their feed{published ? "" : " once the project is published"}.
      </p>
      <textarea
        rows={3}
        value={body}
        maxLength={4000}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Today I…"
        className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm"
      />
      <Button type="button" size="sm" disabled={!body.trim() || post.isPending} onClick={() => post.mutate({ projectId, body: body.trim() })}>
        {post.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : <SendIcon className="size-3.5" />}
        Post update
      </Button>
      {post.error ? <p className="text-xs text-destructive">{post.error.message}</p> : null}
    </div>
  );
}
