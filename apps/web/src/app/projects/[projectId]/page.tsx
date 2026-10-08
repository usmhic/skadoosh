"use client";

import { use, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import type { PublicProject } from "@/lib/trpc/types";
import { Avatar, AvatarFallback, AvatarImage } from "@skaddosh/ui/components/ui/avatar";
import { Button } from "@skaddosh/ui/components/ui/button";
import { cn } from "@skaddosh/ui/lib/utils";
import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  CircleDashedIcon,
  CodeIcon,
  FileBadgeIcon,
  FlagIcon,
  HandHeartIcon,
  HandIcon,
  HandshakeIcon,
  Loader2Icon,
  LockIcon,
  PenLineIcon,
  SparklesIcon,
  SproutIcon,
} from "lucide-react";
import { GenerativeCover } from "@/components/gallery/generative-cover";
import { ContributeDialog, ContributorsSection } from "@/components/project/contributors-section";
import { LicensesSection } from "@/components/project/licenses-section";
import { mediumLabel } from "@/lib/mediums";
import { BodyContent } from "@/components/body-content";
import { FollowButton } from "@/components/follow-button";
import { BackProjectDialog, GiveKudosDialog } from "@/components/kudos/kudos-dialogs";
import {
  BackingProgress,
  HumanMadeNote,
  KudosAmount,
  StageBadge,
  VerifiedBadge,
  initials,
  timeAgo,
} from "@/components/kudos/kudos-ui";

export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const query = trpc.projects.publicById.useQuery({ id: projectId });

  if (query.isLoading) return <ProjectSkeleton />;
  const project = query.data;
  if (!project) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="font-display text-4xl">Project not found</p>
        <p className="mt-2 text-sm text-muted-foreground">It may still be a draft, or it was removed.</p>
        <Button asChild variant="outline" className="mt-6 rounded-full">
          <Link href="/">Explore the gallery</Link>
        </Button>
      </div>
    );
  }

  return <ProjectView project={project} refetch={() => void query.refetch()} />;
}

function ProjectView({ project, refetch }: { project: PublicProject; refetch: () => void }) {
  const [giveOpen, setGiveOpen] = useState(false);
  const [backOpen, setBackOpen] = useState(false);
  const [contribute, setContribute] = useState<{ role: string } | null>(null);
  const offers = trpc.licenses.offers.useQuery({ projectId: project.id });
  const isCancelled = project.stage === "cancelled";
  const kudosNotes = project.recentKudos.filter((k) => k.message).slice(0, 6);
  const canLicense = (offers.data?.offers.length ?? 0) > 0;
  const signedIn = project.viewer.signedIn;

  return (
    <div className="pb-24">
      <div className="mx-auto w-full max-w-[96rem] px-4 pt-6 sm:px-6 lg:px-10">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2rem] bg-muted ring-1 ring-border/60 sm:aspect-[21/9]">
          {project.coverImage ? (
            <img src={project.coverImage} alt="" className="size-full object-cover" />
          ) : (
            <GenerativeCover id={project.id} accent={project.accentColor} medium={project.medium} title={project.title} />
          )}
        </div>

        <header className="mt-8 max-w-4xl">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium">{mediumLabel(project.medium)}</span>
            {project.stage !== "released" && project.stage !== "sustaining" ? <StageBadge stage={project.stage} /> : null}
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                {tag.replace(/-/g, " ")}
              </span>
            ))}
          </div>
          <h1 className="mt-5 text-balance font-display text-5xl leading-[0.95] tracking-tight sm:text-7xl">
            {project.title || "Untitled project"}
          </h1>
          {project.pitch ? <p className="mt-5 max-w-2xl text-pretty text-xl leading-8 text-muted-foreground">{project.pitch}</p> : null}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href={`/${project.creator.username ?? ""}`} className="flex items-center gap-3">
              <Avatar className="size-10">
                {project.creator.image ? <AvatarImage src={project.creator.image} alt="" className="object-cover" /> : null}
                <AvatarFallback className="text-xs font-semibold">{initials(project.creator.name)}</AvatarFallback>
              </Avatar>
              <span>
                <span className="flex items-center gap-1 text-sm font-medium">
                  {project.creator.name} <VerifiedBadge verified={project.creator.verified} />
                </span>
                <span className="block text-xs text-muted-foreground">@{project.creator.username}</span>
              </span>
            </Link>
            {!project.viewer.isOwner ? (
              <FollowButton creatorId={project.creator.id} following={project.viewer.following} signedIn={signedIn} onChanged={refetch} />
            ) : (
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link href={`/studio/projects/${project.id}`}>
                  <PenLineIcon className="size-3.5" /> Edit in studio
                </Link>
              </Button>
            )}
          </div>
        </header>
      </div>

      <div className="mx-auto mt-14 grid w-full max-w-[96rem] gap-14 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:px-10">
        <div className="min-w-0 space-y-20">
          <Section title="The story">
            {project.locked ? (
              <LockedStory project={project} onUnlocked={refetch} />
            ) : (
              <>
                {project.description ? (
                  <div className="max-w-2xl">
                    <BodyContent text={project.description} lang="en" accent={project.accentColor} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">The creator hasn&apos;t written the story yet.</p>
                )}
                {project.images.length ? (
                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {project.images.map((src) => (
                      <img key={src} src={src} alt="" className="w-full rounded-2xl object-cover" />
                    ))}
                  </div>
                ) : null}
                {project.url || project.repoUrl ? (
                  <div className="mt-8 flex flex-wrap gap-2">
                    {project.url ? (
                      <Button asChild variant="outline" size="sm" className="rounded-full">
                        <a href={project.url} target="_blank" rel="noopener noreferrer">
                          Visit project <ArrowUpRightIcon className="size-3.5" />
                        </a>
                      </Button>
                    ) : null}
                    {project.repoUrl ? (
                      <Button asChild variant="outline" size="sm" className="rounded-full">
                        <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">
                          <CodeIcon className="size-3.5" /> Source
                        </a>
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </Section>

          {project.milestones.length ? (
            <Section title="Milestones" hint="Backing is released to the creator as each one is delivered.">
              <ol className="relative max-w-2xl space-y-6 border-l border-border pl-7">
                {project.milestones.map((m) => {
                  const delivered = Boolean(m.deliveredAt);
                  return (
                    <li key={m.id} className="relative">
                      <span className={cn("absolute -left-[2.2rem] top-0.5 flex size-5 items-center justify-center rounded-full bg-background", delivered ? "text-cold" : "text-muted-foreground")}>
                        {delivered ? <CheckCircle2Icon className="size-5" /> : <CircleDashedIcon className="size-5" />}
                      </span>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="font-medium">{m.title}</p>
                        <span className="text-xs text-cold tabular-nums">releases {m.releasePercent}%</span>
                        <span className="text-xs text-muted-foreground">
                          {delivered
                            ? `Delivered ${timeAgo(m.deliveredAt!)}`
                            : m.dueAt
                              ? `Planned ${new Date(m.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
                              : "Planned"}
                        </span>
                      </div>
                      {m.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{m.description}</p> : null}
                    </li>
                  );
                })}
              </ol>
            </Section>
          ) : null}

          <Section title="Process" hint="Dated notes from the creator. Watching the work get made is how you know a person made it.">
            {project.updates.length ? (
              <ol className="max-w-2xl space-y-8">
                {project.updates.map((u) => (
                  <li key={u.id}>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      {u.kind === "milestone" ? <FlagIcon className="size-3 text-cold" /> : u.kind === "stage" ? <SparklesIcon className="size-3 text-hot" /> : <PenLineIcon className="size-3" />}
                      {u.kind === "milestone" ? "Milestone delivered" : u.kind === "stage" ? "Stage change" : "Process note"} · {timeAgo(u.createdAt)}
                    </p>
                    <p className="mt-2 whitespace-pre-line font-serif text-lg leading-8">{u.body}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
          </Section>

          <ContributorsSection projectId={project.id} creator={project.creator} isOwner={project.viewer.isOwner} />

          {project.openRoles.length ? (
            <Section title="Looking for" hint="Open roles on this project. Offer your skills and agree on credit and a share with the creator.">
              <div className="grid gap-4 sm:grid-cols-2">
                {project.openRoles.map((role) => (
                  <div key={role.title} className="flex flex-col rounded-3xl border border-border bg-card p-5">
                    <p className="font-medium">{role.title}</p>
                    {role.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{role.description}</p> : null}
                    {!project.viewer.isOwner ? (
                      signedIn ? (
                        <Button size="sm" variant="outline" className="mt-4 w-fit rounded-full" onClick={() => setContribute({ role: role.title })}>
                          <HandIcon className="size-3.5" /> Offer to help
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="mt-4 w-fit rounded-full">
                          <Link href="/auth/login">Sign in to offer help</Link>
                        </Button>
                      )
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          <LicensesSection projectId={project.id} isOwner={project.viewer.isOwner} signedIn={signedIn} />

          <Section title="Backers" hint="Backer numbers are permanent. Early believers backed while this was still an idea.">
            {project.backers.length ? (
              <ul className="flex flex-wrap gap-2">
                {project.backers.map((b) => (
                  <li key={b.backerNumber}>
                    <Link
                      href={`/${b.backer.username ?? ""}`}
                      className={cn("flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs transition-colors hover:bg-muted", b.earlyBeliever ? "border-cold/40 bg-cold-soft/60" : "border-border bg-card")}
                    >
                      <Avatar className="size-6">
                        {b.backer.image ? <AvatarImage src={b.backer.image} alt="" className="object-cover" /> : null}
                        <AvatarFallback className="text-[0.55rem] font-semibold">{initials(b.backer.name)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{b.backer.name}</span>
                      <span className="font-mono text-muted-foreground">#{b.backerNumber}</span>
                      {b.earlyBeliever ? <span className="font-semibold text-cold">early</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No backers yet. The first one becomes backer #1.</p>
            )}
          </Section>

          {kudosNotes.length ? (
            <Section title="Kind words">
              <ul className="grid gap-4 sm:grid-cols-2">
                {kudosNotes.map((k) => (
                  <li key={k.id} className="rounded-3xl border border-border bg-card p-5">
                    <p className="font-serif text-lg leading-7">“{k.message}”</p>
                    <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <KudosAmount temp="hot" value={k.amount} size="xs" /> {k.giver?.name ?? "Someone"} · {timeAgo(k.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
            <p className="text-sm font-medium">{project.viewer.isOwner ? "How people support this" : "Support this work"}</p>

            <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat label="Kudos" value={project.backing.kudosReceived} />
              <Stat label="backed" value={project.backing.cold} />
              <Stat label="backers" value={project.backing.backersCount} />
            </dl>

            {isCancelled ? (
              <p className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                This project was cancelled. Every unreleased Cold Kudo went back to its backer.
              </p>
            ) : project.backing.goal > 0 && project.backing.acceptsBacking ? (
              <div className="mt-5">
                <BackingProgress cold={project.backing.cold} goal={project.backing.goal} released={project.backing.releasedPercent} />
              </div>
            ) : null}

            {!project.viewer.isOwner && !isCancelled ? (
              <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border">
                <SupportAction
                  icon={HandHeartIcon}
                  title="Appreciate"
                  body="Give Kudos as a thank-you. They go to the creator."
                  href={signedIn ? undefined : "/auth/signup"}
                  onClick={() => setGiveOpen(true)}
                />
                {project.backing.acceptsBacking ? (
                  <SupportAction
                    icon={SproutIcon}
                    title="Back"
                    body={`Fund what's next. Backing now counts ${(project.backing.stageWeightPercent ?? 100) / 100}× and early backers share in success.`}
                    href={signedIn ? undefined : "/auth/signup"}
                    onClick={() => setBackOpen(true)}
                  />
                ) : null}
                {canLicense ? (
                  <SupportAction icon={FileBadgeIcon} title="License" body="Buy the right to use this work, with a verifiable certificate." href="#license" />
                ) : null}
                <SupportAction
                  icon={HandshakeIcon}
                  title="Contribute"
                  body="Offer your skills for credit, and a share if you both agree."
                  href={signedIn ? undefined : "/auth/signup"}
                  onClick={() => setContribute({ role: "" })}
                />
              </div>
            ) : null}

            <p className="mt-5 text-xs leading-5 text-muted-foreground">
              Kudos and backing are support, not ownership. Backers share {project.backing.backerSharePercent}% of what this
              project earns, up to {project.backing.returnCapPercent / 100}×.{" "}
              <Link href="/how-it-works" className="underline underline-offset-2">
                How it works
              </Link>
            </p>
            {project.lastUpdateAt ? <p className="mt-3 text-xs text-muted-foreground">Last update {timeAgo(project.lastUpdateAt)}</p> : null}
          </div>

          {project.viewer.backing ? <YourBacking projectId={project.id} backing={project.viewer.backing} onChanged={refetch} /> : null}

          <HumanMadeNote aiUsage={project.aiUsage} confirmed={Boolean(project.humanMadeConfirmedAt)} />
        </aside>
      </div>

      <GiveKudosDialog
        open={giveOpen}
        onOpenChange={setGiveOpen}
        projectId={project.id}
        creatorName={project.creator.name}
        backerSharePercent={project.backing.backerSharePercent}
        hasBackers={project.backing.backersCount > 0}
      />
      <BackProjectDialog
        open={backOpen}
        onOpenChange={setBackOpen}
        project={{
          id: project.id,
          title: project.title,
          creatorName: project.creator.name,
          stage: project.stage,
          stageWeightPercent: project.backing.stageWeightPercent,
          backerSharePercent: project.backing.backerSharePercent,
          returnCapPercent: project.backing.returnCapPercent,
          hasMilestones: project.milestones.length > 0,
        }}
      />
      {contribute ? (
        <ContributeDialog
          key={contribute.role}
          projectId={project.id}
          defaultRole={contribute.role}
          open
          onOpenChange={(open) => !open && setContribute(null)}
        />
      ) : null}
    </div>
  );
}

function SupportAction({
  icon: Icon,
  title,
  body,
  href,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted transition-colors group-hover:bg-foreground group-hover:text-background">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs leading-5 text-muted-foreground">{body}</span>
      </span>
      <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
    </>
  );
  const className = "group flex w-full items-center gap-3 bg-card p-3.5 text-left transition-colors hover:bg-muted/60";
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-4xl tracking-tight">{title}</h2>
      {hint ? <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{hint}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border px-2 py-2.5">
      <dd className="font-display text-lg font-semibold tabular-nums">{value}</dd>
      <dt className="text-[0.68rem] text-muted-foreground">{label}</dt>
    </div>
  );
}

function YourBacking({
  projectId,
  backing,
  onChanged,
}: {
  projectId: string;
  backing: NonNullable<PublicProject["viewer"]["backing"]>;
  onChanged: () => void;
}) {
  const utils = trpc.useUtils();
  const withdraw = trpc.projects.withdrawBacking.useMutation({
    onSuccess: async () => {
      onChanged();
      await utils.kudos.wallet.invalidate();
    },
  });
  if (backing.amount <= 0) return null;
  return (
    <div className="rounded-3xl border border-cold/30 bg-cold-soft/50 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-cold">
        You&apos;re backer #{backing.backerNumber}
        {backing.earlyBeliever ? " · early believer" : ""}
      </p>
      <dl className="mt-3 space-y-1.5 text-sm">
        <Row label="Committed" value={<KudosAmount temp="cold" value={backing.amount} size="xs" />} />
        <Row label="Still locked" value={<span className="tabular-nums">{backing.locked}</span>} />
        <Row label="Released to creator" value={<span className="tabular-nums">{backing.released}</span>} />
        <Row
          label="Returned to you"
          value={
            <span className="tabular-nums">
              <KudosAmount temp="hot" value={backing.returned} size="xs" />
              <span className="text-muted-foreground"> / {backing.returnCap}</span>
            </span>
          }
        />
      </dl>
      {backing.canWithdraw ? (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 w-full text-xs text-muted-foreground"
          disabled={withdraw.isPending}
          onClick={() => withdraw.mutate({ projectId })}
        >
          {withdraw.isPending ? <Loader2Icon className="size-3.5 animate-spin" /> : null}
          Changed your mind? Withdraw (within 48 hours)
        </Button>
      ) : null}
      {withdraw.error ? <p className="mt-2 text-xs text-destructive">{withdraw.error.message}</p> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function LockedStory({ project, onUnlocked }: { project: Extract<PublicProject, { locked: true }>; onUnlocked: () => void }) {
  const [sent, setSent] = useState(false);
  const unlock = trpc.access.unlockWithKudos.useMutation({ onSuccess: onUnlocked });
  const request = trpc.access.request.useMutation({ onSuccess: () => setSent(true) });
  const error = unlock.error ?? request.error;
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <p className="text-sm leading-7 text-muted-foreground">{project.description}…</p>
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <LockIcon className="size-4 text-muted-foreground" />
        <p className="mr-auto text-sm">The full story is shared with supporters.</p>
        {!project.viewer.signedIn ? (
          <Button asChild size="sm" className="rounded-full">
            <Link href="/auth/login">Sign in to unlock</Link>
          </Button>
        ) : project.unlockMethod === "kudos" ? (
          <Button
            size="sm"
            className="rounded-full bg-hot text-hot-foreground hover:bg-hot/90"
            disabled={unlock.isPending}
            onClick={() => unlock.mutate({ contentType: "project", contentId: project.id })}
          >
            Unlock for {project.kudosPrice} Kudos
          </Button>
        ) : sent ? (
          <p className="text-sm font-medium">Request sent</p>
        ) : (
          <Button size="sm" variant="outline" className="rounded-full" disabled={request.isPending} onClick={() => request.mutate({ contentType: "project", contentId: project.id })}>
            Request access
          </Button>
        )}
      </div>
      {error ? <p className="mt-2 text-xs text-destructive">{error.message}</p> : null}
    </div>
  );
}

function ProjectSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="h-5 w-24 animate-pulse rounded-full bg-muted" />
      <div className="mt-5 h-12 w-2/3 animate-pulse rounded-xl bg-muted" />
      <div className="mt-4 h-6 w-1/2 animate-pulse rounded-lg bg-muted" />
      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 animate-pulse rounded bg-muted" />
          ))}
        </div>
        <div className="h-80 animate-pulse rounded-3xl bg-muted" />
      </div>
    </div>
  );
}
