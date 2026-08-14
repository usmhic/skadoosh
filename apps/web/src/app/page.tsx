import { Header } from "@/components/header";
import { Suspense } from "react";
import { DiscoverySurface } from "@/components/discovery/discovery-surface";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db, portfolioProfiles } from "@skaddosh/db";

export const dynamic = "force-dynamic";

function normalizeHost(value: string | null) {
  return (value ?? "").split(":")[0]?.trim().toLowerCase() ?? "";
}

function isPrimaryAppHost(host: string) {
  if (!host || host === "localhost" || host === "127.0.0.1" || host.endsWith(".localhost")) return true;
  try {
    const appHost = normalizeHost(process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL).host : null);
    return Boolean(appHost && host === appHost);
  } catch {
    return false;
  }
}

async function redirectCustomDomainHome() {
  const host = normalizeHost((await headers()).get("host"));
  if (isPrimaryAppHost(host)) return;

  const [profile] = await db
    .select({ username: portfolioProfiles.username })
    .from(portfolioProfiles)
    .where(and(
      eq(portfolioProfiles.published, true),
      sql`lower(${portfolioProfiles.metadata}->'customization'->>'customDomain') = ${host}`,
      sql`(${portfolioProfiles.metadata}->'customization'->>'customDomainRequested')::boolean = true`,
    ))
    .limit(1);

  if (profile?.username) redirect(`/portfolio/${profile.username}`);
}

export default async function RootPage() {
  await redirectCustomDomainHome();

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Suspense>
          <DiscoverySurface basePath="/" />
        </Suspense>
      </main>
    </div>
  );
}
