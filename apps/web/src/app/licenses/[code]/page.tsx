"use client";

import { use } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { cn } from "@skaddosh/ui/lib/utils";
import { ArrowUpRightIcon, CheckIcon, PrinterIcon, ShieldAlertIcon, XIcon } from "lucide-react";
import { LogoMark } from "@/components/brand-mark";

export default function LicenseCertificatePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const isNew = useSearchParams().get("new") === "1";
  const { data: cert, isLoading } = trpc.licenses.certificate.useQuery({ code });

  if (isLoading) return <div className="mx-auto mt-24 h-96 max-w-3xl animate-pulse rounded-3xl bg-muted" />;
  if (!cert) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <ShieldAlertIcon className="mx-auto size-8 text-destructive" />
        <p className="mt-4 font-display text-4xl">No licence with that code</p>
        <p className="mt-2 text-sm text-muted-foreground">Check the certificate code and try again. Codes look like SKD-7QK-M3PX.</p>
      </div>
    );
  }

  const valid = cert.intact && cert.status === "active";

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      {isNew ? (
        <div className="mb-8 rounded-2xl border border-verified/30 bg-verified/5 p-4 text-sm">
          Your licence is ready. Keep this page: anyone can use the link to check your rights.
        </div>
      ) : null}

      <article className="overflow-hidden rounded-[2rem] border border-border bg-card shadow-sm print:shadow-none">
        <header className="flex flex-wrap items-start gap-6 border-b border-border p-8 sm:p-10">
          <div className="mr-auto">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Licence certificate</p>
            <h1 className="mt-3 font-display text-5xl leading-none tracking-tight">{cert.tier.label} licence</h1>
            <p className="mt-3 text-lg text-muted-foreground">
              for{" "}
              {cert.projectId ? (
                <Link href={`/projects/${cert.projectId}`} className="text-foreground underline-offset-4 hover:underline">
                  {cert.projectTitle}
                </Link>
              ) : (
                <span className="text-foreground">{cert.projectTitle}</span>
              )}
            </p>
          </div>
          <LogoMark className="size-12" />
        </header>

        <dl className="grid gap-px bg-border sm:grid-cols-2">
          <Field label="Licensed to" value={cert.licenseeName} />
          <Field label="Licensed by" value={cert.creatorName} />
          <Field label="Issued" value={new Date(cert.issuedAt).toLocaleDateString(undefined, { dateStyle: "long" })} />
          <Field label="Certificate" value={<span className="font-mono">{cert.certificateCode}</span>} />
        </dl>

        <section className="grid gap-8 p-8 sm:grid-cols-2 sm:p-10">
          <div>
            <h2 className="text-sm font-medium">You may</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {cert.tier.allows.map((line) => (
                <li key={line} className="flex gap-2">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-verified" /> {line}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-medium">You may not</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {cert.tier.forbids.map((line) => (
                <li key={line} className="flex gap-2">
                  <XIcon className="mt-0.5 size-4 shrink-0" /> {line}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className={cn("mx-8 mb-8 rounded-2xl border p-5 sm:mx-10", valid ? "border-verified/30 bg-verified/5" : "border-destructive/30 bg-destructive/5")}>
          <p className="flex items-center gap-2 text-sm font-medium">
            {valid ? <CheckIcon className="size-4 text-verified" /> : <ShieldAlertIcon className="size-4 text-destructive" />}
            {cert.status !== "active"
              ? "This licence has been revoked."
              : cert.intact
                ? "Valid. These terms match the fingerprint recorded when the licence was issued."
                : "The terms don't match the recorded fingerprint. Contact skaddosh support."}
          </p>
          <p className="mt-2 break-all font-mono text-[0.7rem] text-muted-foreground">
            Terms v{cert.termsVersion} · SHA-256 {cert.termsHash}
          </p>
          {cert.attestation ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {cert.attestation.status === "confirmed" && cert.attestation.explorerUrl ? (
                <a href={cert.attestation.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
                  Recorded publicly on Base <ArrowUpRightIcon className="size-3" />
                </a>
              ) : cert.attestation.status === "confirmed" ? (
                "Recorded publicly on-chain."
              ) : (
                "Public record pending."
              )}
            </p>
          ) : null}
        </section>

        <details className="border-t border-border p-8 sm:p-10">
          <summary className="cursor-pointer text-sm font-medium">Full licence terms</summary>
          <pre className="mt-4 whitespace-pre-wrap font-serif text-sm leading-7">{cert.termsText}</pre>
        </details>
      </article>

      <div className="mt-6 flex justify-end print:hidden">
        <Button variant="outline" className="rounded-full" onClick={() => window.print()}>
          <PrinterIcon className="size-4" /> Print or save as PDF
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-card px-8 py-5 sm:px-10">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-base">{value}</dd>
    </div>
  );
}
