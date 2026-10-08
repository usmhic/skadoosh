"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { ActionError } from "@/components/action-error";

/** Development stand-in for the provider's hosted flow (IDENTITY_PROVIDER=mock only). */
export default function MockVerificationPage() {
  return (
    <Suspense>
      <MockVerification />
    </Suspense>
  );
}

function MockVerification() {
  const router = useRouter();
  const session = useSearchParams().get("session") ?? "";
  const [country, setCountry] = useState("PT");
  const decide = trpc.identity.mockDecide.useMutation({
    onSuccess: () => router.push("/welcome?step=verify&returned=1"),
  });

  return (
    <div className="mx-auto max-w-md px-4 py-20">
      <p className="text-xs uppercase tracking-[0.2em] text-hot">Development only</p>
      <h1 className="mt-3 font-display text-4xl">Test verification</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        In production this is the verification partner&apos;s secure page. Here you can pick the outcome.
      </p>
      <label className="mt-8 block text-sm">
        Document country
        <select value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3">
          {["PT", "ES", "FR", "DE", "US", "GB", "MA", "JP"].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      <div className="mt-6 flex gap-3">
        <Button className="flex-1 rounded-full" disabled={decide.isPending} onClick={() => decide.mutate({ sessionId: session, outcome: "verified", country })}>
          Approve
        </Button>
        <Button variant="outline" className="flex-1 rounded-full" disabled={decide.isPending} onClick={() => decide.mutate({ sessionId: session, outcome: "rejected", country })}>
          Decline
        </Button>
      </div>
      <div className="mt-4">
        <ActionError error={decide.error} />
      </div>
    </div>
  );
}
