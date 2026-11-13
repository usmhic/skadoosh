import Link from "next/link";
import { ShieldCheckIcon } from "lucide-react";

type ErrorLike = { message: string; data?: { code?: string } | null } | null | undefined;

/**
 * Shows a mutation error. When the server says verification is needed, offers a direct path to
 * verify instead of a dead end.
 */
export function ActionError({ error }: { error: ErrorLike }) {
  if (!error) return null;
  const needsVerification = error.data?.code === "PRECONDITION_FAILED" && /verify/i.test(error.message);
  if (!needsVerification) return <p className="text-xs text-destructive">{error.message}</p>;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-verified/30 bg-verified/5 p-3 text-sm">
      <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-verified" />
      <div className="min-w-0 flex-1">
        <p>{error.message}</p>
        <Link href="/welcome?step=verify" className="mt-1 inline-block font-medium underline underline-offset-2">
          Verify now
        </Link>
      </div>
    </div>
  );
}
