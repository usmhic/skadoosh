"use client";

import { use, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import type { PublicProject } from "@/lib/trpc/types";
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
import { cn } from "@skaddosh/ui/lib/utils";
import {
  ArrowUpRightIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CodeIcon,
  FlagIcon,
  HandIcon,
  Loader2Icon,
  LockIcon,
  PenLineIcon,
  SparklesIcon,
} from "lucide-react";
import { BodyContent } from "@/components/body-content";
import { FollowButton } from "@/components/follow-button";
import { BackProjectDialog, GiveKudosDialog } from "@/components/kudos/kudos-dialogs";
import {
  BackingProgress,
  HumanMadeNote,
  KudosAmount,
  KudosMark,
  StageBadge,
  StageTrack,
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
        <p className="font-display text-2xl font-semibold">Project not found</p>
        <p className="mt-2 text-sm text-muted-foreground">It may still be a draft, or it was removed.</p>
        <Button asChild variant="outline" className="mt-6 rounded-full">
          <Link href="/?mode=backing">Discover projects</Link>
        </Button>
      </div>
    );
  }

  return <ProjectView project={project} refetch={() => void query.refetch()} />;
}

function ProjectView({ project, refetch }: { project: PublicProject; refetch: () => void }) {
  const [giveOpen, setGiveOpen] = useState(false);
  const [backOpen, setBackOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState<string | null>(null);
  const isCancelled = project.stage === "cancelled";
  const kudosNotes = project.recentKudos.filter((k) => k.message).slice(0, 6);

  return (
    <div className="pb-20">
      {/* Hero */}
      <section
        className="relative overflow-hidden border-b border-border"
        style={{
          background: project.coverImage
            ? undefined
            : `radial-gradient(80% 120% at 0% 0%, ${project.accentColor}40, transparent 60%), radial-gradient(70% 100% at 100% 100%, ${project.accentColor}26, transparent 60%)`,
        }}
      >
        {project.coverImage ? (
          <>
            <img src={project.coverImage} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/30" />
          </>
        ) : null}
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-10 pt-14 sm:px-6 lg:px-8 lg:pt-20">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={project.stage} />
            {project.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="rounded-full border border-border bg-background/70 px-2 py-0.5 text-[0.68rem] text-muted-foreground">
                {tag.replace(/-/g, " ")}
              </span>
            ))}
          </div>
          <h1 className="mt-4 max-w-3xl text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            {project.title || "Untitled project"}
          </h1>
          {project.pitch ? <p className="mt-4 max-w-2xl text-pretty text-lg leading-8 text-muted-foreground">{project.pitch}</p> : null}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={`/${project.creator.username ?? ""}`} className="flex items-center gap-2.5">
              <Avatar className="size-9">
                {project.creator.image ? <AvatarImage src={project.creator.image} alt="" className="object-cover" /> : null}
                <AvatarFallback className="text-xs font-semibold">{initials(project.creator.name)}</AvatarFallback>
              </Avatar>
              <span>
                <span className="block text-sm font-semibold">{project.creator.name}</span>
                <span className="block text-xs text-muted-foreground">@{project.creator.username}</span>
              </span>
            </Link>
            {!project.viewer.isOwner ? (
              <FollowButton
                creatorId={project.creator.id}
                following={project.viewer.following}
                signedIn={project.viewer.signedIn}
                onChanged={refetch}
              />
            ) : (
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link href={`/studio/projects/${project.id}`}>
                  <PenLineIcon className="size-3.5" /> Edit in studio
                </Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8">
        {/* Main column */}
        <div className="min-w-0 space-y-12">
          <Section title="The story">
            {project.locked ? (
              <LockedStory project={project} onUnlocked={refetch} />
            ) : (
              <>
                {project.description ? (
                  <BodyContent text={project.description} lang="en" accent={project.accentColor} />
                ) : (
                  <p className="text-sm text-muted-foreground">The creator hasn&apos;t written the story yet.</p>
                )}
                {project.images.length ? (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {project.images.map((src) => (
                      <img key={src} src={src} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover" />
                    ))}
                  </div>
                ) : null}
                {project.url || project.repoUrl ? (
                  <div className="mt-6 flex flex-wrap gap-2">
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
            <Section title="Milestones" hint="Cold Kudos are released to the creator as each one is delivered.">
              <ol className="relative space-y-4 border-l border-border pl-6">
                {project.milestones.map((m) => {
                  const delivered = Boolean(m.deliveredAt);
                  return (
                    <li key={m.id} className="relative">
                      <span
                        className={cn(
                          "absolute -left-[1.95rem] top-0.5 flex size-5 items-center justify-center rounded-full bg-background",
                          delivered ? "text-cold" : "text-muted-foreground",
                        )}
                      >
                        {delivered ? <CheckCircle2Icon className="size-5" /> : <CircleDashedIcon className="size-5" />}
                      </span>
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <p className="font-semibold">{m.title}</p>
                        <span className="text-xs font-medium text-cold tabular-nums">releases {m.releasePercent}%</span>
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

          <Section title="Process log" hint="Dated notes from the creator. Watching the work get made is how you know a human made it.">
            {project.updates.length ? (
              <ol className="space-y-4">
                {project.updates.map((u) => (
                  <li key={u.id} className="rounded-2xl border border-border bg-card p-4">
                    <p className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground">
                      {u.kind === "milestone" ? (
                        <FlagIcon className="size-3 text-cold" />
                      ) : u.kind === "stage" ? (
                        <SparklesIcon className="size-3 text-hot" />
                      ) : (
                        <PenLineIcon className="size-3" />
                      )}
                      {u.kind === "milestone" ? "Milestone delivered" : u.kind === "stage" ? "Stage change" : "Process"} ·{" "}
                      {timeAgo(u.createdAt)}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-7">{u.body}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">No updates yet.</p>
            )}
          </Section>

          {project.openRoles.length ? (
            <Section title="Open roles" hint="This project is looking for collaborators.">
              <div className="grid gap-3 sm:grid-cols-2">
                {project.openRoles.map((role) => (
                  <div key={role.title} className="flex flex-col rounded-2xl border border-border bg-card p-4">
                    <p className="font-semibold">{role.title}</p>
                    {role.description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{role.description}</p> : null}
                    {!project.viewer.isOwner ? (
                      project.viewer.signedIn ? (
                        <Button size="sm" variant="outline" className="mt-4 w-fit rounded-full" onClick={() => setRoleOpen(role.title)}>
                          <HandIcon className="size-3.5" /> Raise your hand
                        </Button>
                      ) : (
                        <Button asChild size="sm" variant="outline" className="mt-4 w-fit rounded-full">
                          <Link href="/auth/login">Sign in to raise your hand</Link>
                        </Button>
                      )
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          <Section title="Backers" hint="Backer numbers are permanent. Early believers backed while this was still an idea.">
            {project.backers.length ? (
              <ul className="flex flex-wrap gap-2">
                {project.backers.map((b) => (
                  <li key={b.backerNumber}>
                    <Link
                      href={`/${b.backer.username ?? ""}`}
                      className={cn(
                        "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs transition-colors hover:bg-muted",
                        b.earlyBeliever ? "border-cold/40 bg-cold-soft/60" : "border-border bg-card",
                      )}
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
            <Section title="Kudos notes">
              <ul className="grid gap-3 sm:grid-cols-2">
                {kudosNotes.map((k) => (
                    <li key={k.id} className="rounded-2xl border border-border bg-card p-4">
                      <p className="text-sm leading-6">“{k.message}”</p>
                      <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <KudosAmount temp="hot" value={k.amount} size="xs" /> {k.giver?.name ?? "Someone"} · {timeAgo(k.createdAt)}
                      </p>
                    </li>
                  ))}
              </ul>
            </Section>
          ) : null}
        </div>

        {/* Kudos panel */}
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            {isCancelled ? (
              <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                This project was cancelled. Every unreleased Cold Kudo went back to its backer.
              </p>
            ) : (
              <StageTrack stage={project.stage} />
            )}

            <div className="mt-5">
              <BackingProgress cold={project.backing.cold} goal={project.backing.goal} released={project.backing.releasedPercent} />
            </div>

            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              <Stat label="backers" value={project.backing.backersCount} />
              <Stat label="Kudos" value={project.backing.kudosReceived} />
              <Stat label="released" value={`${project.backing.releasedPercent}%`} />
            </dl>

            <p className="mt-5 rounded-2xl bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
              Backers share <span className="font-semibold text-foreground">{project.backing.backerSharePercent}%</span> of the Kudos this
              project earns, up to <span className="font-semibold text-foreground">{project.backing.returnCapPercent / 100}×</span> what
              they put in.
            </p>

            {!project.viewer.isOwner && !isCancelled ? (
              <div className="mt-5 grid gap-2">
                {project.backing.acceptsBacking ? (
                  project.viewer.signedIn ? (
                    <Button className="h-11 rounded-full bg-cold text-cold-foreground hover:bg-cold/90" onClick={() => setBackOpen(true)}>
                      <KudosMark temp="cold" size="sm" className="bg-cold-foreground text-cold" />
                      {project.viewer.backing ? "Back some more" : "Back this project"}
                    </Button>
                  ) : (
                    <Button asChild className="h-11 rounded-full bg-cold text-cold-foreground hover:bg-cold/90">
                      <Link href="/auth/signup">Sign up to back this project</Link>
                    </Button>
                  )
                ) : null}
                {project.viewer.signedIn ? (
                  <Button variant="outline" className="h-11 rounded-full border-hot/40 text-hot hover:bg-hot-soft" onClick={() => setGiveOpen(true)}>
                    <KudosMark temp="hot" size="sm" /> Give Kudos
                  </Button>
                ) : null}
                {project.backing.stageWeightPercent ? (
                  <p className="text-center text-[0.7rem] text-muted-foreground">
                    Backing now counts {project.backing.stageWeightPercent / 100}× toward returns.
                  </p>
                ) : null}
              </div>
            ) : null}

            {project.lastUpdateAt ? (
              <p className="mt-4 text-center text-[0.7rem] text-muted-foreground">Last update {timeAgo(project.lastUpdateAt)}</p>
            ) : null}
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
      <RaiseHandDialog projectId={project.id} role={roleOpen} onClose={() => setRoleOpen(null)} />
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      <div className="mt-5">{children}</div>
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

function RaiseHandDialog({ projectId, role, onClose }: { projectId: string; role: string | null; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const raise = trpc.projects.raiseHand.useMutation();
  const done = raise.isSuccess;
  return (
    <Dialog
      open={role !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          raise.reset();
          setMessage("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Raise your hand</DialogTitle>
          <DialogDescription>For: {role}. Tell the creator what you&apos;d bring and link to your work.</DialogDescription>
        </DialogHeader>
        {done ? (
          <p className="rounded-xl bg-muted p-4 text-sm">
            {raise.data?.delivered
              ? "Sent to the creator's inbox. They'll reply by email."
              : "This creator hasn't set up an inbox yet, so the message couldn't be delivered. Try following them instead."}
          </p>
        ) : (
          <textarea
            rows={5}
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi! I'm an illustrator working in ink…"
            className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/30"
          />
        )}
        {raise.error ? <p className="text-xs text-destructive">{raise.error.message}</p> : null}
        <DialogFooter>
          {done ? (
            <Button onClick={onClose}>Done</Button>
          ) : (
            <Button
              disabled={!message.trim() || raise.isPending}
              onClick={() => role && raise.mutate({ projectId, role, message: message.trim() })}
            >
              {raise.isPending ? <Loader2Icon className="size-4 animate-spin" /> : <HandIcon className="size-4" />}
              Send
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
