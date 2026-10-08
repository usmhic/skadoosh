import { cn } from "@skaddosh/ui/lib/utils";
import { CheckIcon } from "lucide-react";

export type KudosTemp = "hot" | "cold";
export type ProjectStage = "idea" | "making" | "released" | "sustaining" | "cancelled";

/** The Kudos glyph: an italic K in a coin, ember for Hot and glacier for Cold. */
export function KudosMark({
  temp = "hot",
  size = "sm",
  className,
}: {
  temp?: KudosTemp;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-display font-semibold italic leading-none",
        temp === "hot" ? "bg-hot text-hot-foreground" : "bg-cold text-cold-foreground",
        size === "xs" && "size-3.5 text-[0.55rem]",
        size === "sm" && "size-4 text-[0.62rem]",
        size === "md" && "size-5 text-[0.75rem]",
        size === "lg" && "size-8 text-base",
        className,
      )}
    >
      K
    </span>
  );
}

export function KudosAmount({
  temp = "hot",
  value,
  label,
  size = "sm",
  className,
}: {
  temp?: KudosTemp;
  value: number;
  label?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 tabular-nums", className)}>
      <KudosMark temp={temp} size={size} />
      <span className="font-semibold">{value.toLocaleString()}</span>
      {label ? <span className="text-muted-foreground">{label}</span> : null}
    </span>
  );
}

export const STAGES: Array<{ value: Exclude<ProjectStage, "cancelled">; label: string; hint: string }> = [
  { value: "idea", label: "Idea", hint: "Taking shape. Backing now counts 1.5×." },
  { value: "making", label: "Making", hint: "Being made in public. Backing counts 1.25×." },
  { value: "released", label: "Released", hint: "Shipped. All Cold Kudos released." },
  { value: "sustaining", label: "Sustaining", hint: "Living on, paying backers back." },
];

export function stageLabel(stage: ProjectStage) {
  return stage === "cancelled" ? "Cancelled" : (STAGES.find((s) => s.value === stage)?.label ?? stage);
}

export function StageBadge({ stage, className }: { stage: ProjectStage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider",
        stage === "idea" && "border-hot/30 bg-hot-soft text-hot",
        stage === "making" && "border-cold/30 bg-cold-soft text-cold",
        (stage === "released" || stage === "sustaining") && "border-border bg-muted text-foreground",
        stage === "cancelled" && "border-destructive/30 text-destructive",
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          stage === "idea" && "bg-hot",
          stage === "making" && "bg-cold",
          (stage === "released" || stage === "sustaining") && "bg-foreground/60",
          stage === "cancelled" && "bg-destructive",
        )}
      />
      {stageLabel(stage)}
    </span>
  );
}

/** Idea → Making → Released → Sustaining, with the current stage highlighted. */
export function StageTrack({ stage }: { stage: ProjectStage }) {
  const current = STAGES.findIndex((s) => s.value === stage);
  return (
    <ol className="flex w-full items-center gap-1.5" aria-label="Project stage">
      {STAGES.map((s, index) => {
        const done = current > index;
        const active = current === index;
        return (
          <li key={s.value} className="flex min-w-0 flex-1 flex-col gap-1.5" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "h-1.5 rounded-full",
                done || active ? (index === 0 ? "bg-hot" : index === 1 ? "bg-cold" : "bg-foreground/70") : "bg-muted",
              )}
            />
            <span
              className={cn(
                "truncate text-[0.68rem] font-medium",
                active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/60",
              )}
            >
              {done ? <CheckIcon className="mr-0.5 inline size-3" /> : null}
              {s.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function BackingProgress({
  cold,
  goal,
  released,
  compact = false,
}: {
  cold: number;
  goal: number;
  /** Share of the plan already delivered (0–100). Shown as a darker band. */
  released?: number;
  compact?: boolean;
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((cold / goal) * 100)) : 0;
  return (
    <div className="w-full">
      <div className={cn("relative overflow-hidden rounded-full bg-cold-soft", compact ? "h-1.5" : "h-2.5")}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-cold/80 transition-all" style={{ width: `${pct}%` }} />
        {released ? (
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-cold"
            style={{ width: `${Math.min(pct, (pct * released) / 100)}%` }}
          />
        ) : null}
      </div>
      {!compact ? (
        <div className="mt-2 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground tabular-nums">{cold.toLocaleString()}</span>
            {goal > 0 ? <> of {goal.toLocaleString()} Cold Kudos</> : <> Cold Kudos backing</>}
          </span>
          {goal > 0 ? <span className="tabular-nums">{pct}%</span> : null}
        </div>
      ) : null}
    </div>
  );
}

export type Reputation = {
  backedBy: number;
  milestonesDelivered: number;
  milestonesPlanned: number;
  supports: number;
  earlyBeliever: number;
  processPosts: number;
  kudosReceived: number;
};

/** Reputation as checkable signals, never a single score. */
export function ReputationSignals({ reputation, className }: { reputation: Reputation; className?: string }) {
  const signals = [
    { value: reputation.backedBy, label: "backed by", hint: "people who gave or backed" },
    {
      value: reputation.milestonesPlanned ? `${reputation.milestonesDelivered}/${reputation.milestonesPlanned}` : "–",
      label: "delivered",
      hint: "milestones delivered",
    },
    { value: reputation.supports, label: "supports", hint: "creators they back or give to" },
    { value: reputation.earlyBeliever, label: "early believer", hint: "backed at Idea, then shipped" },
  ];
  return (
    <dl className={cn("grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-4", className)}>
      {signals.map((s) => (
        <div key={s.label} className="bg-card px-4 py-3" title={s.hint}>
          <dd className="font-display text-xl font-semibold tabular-nums">{s.value}</dd>
          <dt className="mt-0.5 text-xs text-muted-foreground">{s.label}</dt>
        </div>
      ))}
    </dl>
  );
}

export const AI_USAGE_LABEL: Record<string, string> = {
  research: "Research",
  editing: "Editing & proofreading",
  translation: "Translation",
  tools: "Tools & code",
  reference: "Reference material",
};

/** The public "Made by humans" disclosure. */
export function HumanMadeNote({ aiUsage, confirmed }: { aiUsage: string[]; confirmed: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-sm font-semibold">{confirmed ? "Made by humans" : "Originality not confirmed yet"}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {aiUsage.length === 0
          ? "The creator says no AI was used in making this."
          : `The creator used AI to help with: ${aiUsage.map((u) => AI_USAGE_LABEL[u]?.toLowerCase() ?? u).join(", ")}. The work itself is theirs.`}
      </p>
    </div>
  );
}

export function initials(name: string | null | undefined) {
  return (
    (name ?? "")
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function timeAgo(date: Date | string) {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days < 0) return `in ${Math.abs(days)}d`;
  if (days === 0) {
    const hours = Math.floor(diff / 3_600_000);
    return hours <= 0 ? "just now" : `${hours}h ago`;
  }
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}
