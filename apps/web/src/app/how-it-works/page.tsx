import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@skaddosh/ui/components/ui/button";
import { FileBadgeIcon, HandHeartIcon, HandshakeIcon, ShieldCheckIcon, SproutIcon } from "lucide-react";
import { KudosMark } from "@/components/kudos/kudos-ui";

export const metadata: Metadata = {
  title: "How it works",
  description: "Appreciate, back, license, and contribute: four ways to support original work, and what each one means.",
};

const WAYS = [
  {
    icon: HandHeartIcon,
    title: "Appreciate",
    temp: "hot" as const,
    what: "Give Kudos to any piece or project you love.",
    get: "A thank-you, and your name on the work's Kudos notes.",
    isnt: "It isn't ownership or a licence. A gift is a gift.",
  },
  {
    icon: SproutIcon,
    title: "Back",
    temp: "cold" as const,
    what: "Commit Kudos to a project that's still being made.",
    get: "A backer number. Early backers share a capped part of what the project earns, paid in Kudos. You get everything unreleased back if it's cancelled.",
    isnt: "It isn't an investment and gives you no rights over the work.",
  },
  {
    icon: FileBadgeIcon,
    title: "License",
    temp: "hot" as const,
    what: "Buy the right to use a work: personal, commercial, or exclusive.",
    get: "A certificate with plain-language terms that anyone can verify.",
    isnt: "It's permission to use the work, not ownership of it.",
  },
  {
    icon: HandshakeIcon,
    title: "Contribute",
    temp: "cold" as const,
    what: "Offer your skills to a project, or accept a creator's invitation.",
    get: "Credit on the work and, if you both agree, a share of what it earns. You can also co-own your contribution.",
    isnt: "Nobody can buy their way in. Contributor shares are earned with work and need both people to agree.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="max-w-3xl">
        <p className="text-sm text-muted-foreground">How it works</p>
        <h1 className="mt-3 text-balance font-display text-5xl leading-[1] tracking-tight sm:text-7xl">
          Four ways to support original work.
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Each one does something different, and the differences matter. Here&apos;s what you get, and
          what you don&apos;t.
        </p>
      </header>

      <div className="mt-14 grid gap-5 md:grid-cols-2">
        {WAYS.map(({ icon: Icon, title, temp, what, get, isnt }) => (
          <section key={title} className="flex flex-col rounded-3xl border border-border bg-card p-7">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-2xl bg-muted">
                <Icon className="size-5" />
              </span>
              <h2 className="font-display text-3xl">{title}</h2>
              <KudosMark temp={temp} className="ml-auto" />
            </div>
            <p className="mt-5 text-base leading-7">{what}</p>
            <dl className="mt-5 space-y-3 text-sm leading-6">
              <div>
                <dt className="font-medium">What you get</dt>
                <dd className="text-muted-foreground">{get}</dd>
              </div>
              <div>
                <dt className="font-medium">What it isn&apos;t</dt>
                <dd className="text-muted-foreground">{isnt}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>

      <section className="mt-20 grid gap-10 lg:grid-cols-3">
        <div>
          <ShieldCheckIcon className="size-6 text-verified" />
          <h2 className="mt-4 font-display text-3xl">Made by real people</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Creators verify their identity before they publish, sell licences, or take a revenue share. Our
            verification partner checks the document. We only keep the result and the issuing country, never
            the document or your photo.
          </p>
        </div>
        <div>
          <span className="font-display text-3xl italic text-hot">Aa</span>
          <h2 className="mt-4 font-display text-3xl">Original, human work</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            AI can help with research, editing, or tools, and creators say so on every work. It can&apos;t be the
            work. Process logs and registration timestamps show how and when something was made.
          </p>
        </div>
        <div>
          <KudosMark size="lg" />
          <h2 className="mt-4 font-display text-3xl">Kudos, on-chain if you like</h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Kudos work like credits inside skaddosh, with no crypto needed. Where it&apos;s allowed, verified members
            can also hold them in their own wallet as a token on Base, and licences and contributions are
            recorded publicly so anyone can verify them.
          </p>
        </div>
      </section>

      <div className="mt-20 flex flex-wrap items-center gap-4 rounded-3xl bg-foreground p-8 text-background sm:p-10">
        <p className="mr-auto max-w-xl font-display text-3xl leading-tight sm:text-4xl">
          Show your work. Find the people who believe in it.
        </p>
        <Button asChild size="lg" variant="secondary" className="h-12 rounded-full px-6">
          <Link href="/auth/signup">Start your gallery</Link>
        </Button>
      </div>
    </div>
  );
}
