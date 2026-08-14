"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { trpc } from "@/lib/trpc/provider";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { data: me, isLoading } = trpc.users.me.useQuery(undefined, { enabled: !!session });

  useEffect(() => {
    if (isPending || isLoading) return;
    if (!session) { router.replace("/auth/login"); return; }
    const username = (me?.user as { username?: string } | undefined)?.username;
    if (username) { router.replace(`/${username}`); return; }
    router.replace("/settings");
  }, [session, isPending, me, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="size-5 animate-spin rounded-full border-2 border-border border-t-foreground" />
    </div>
  );
}
