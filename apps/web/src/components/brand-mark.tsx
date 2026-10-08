import Link from "next/link";
import { cn } from "@skaddosh/ui/lib/utils";

/**
 * The skaddosh mark: a four-point spark (an original idea) with an ember dot (a Kudo).
 * Inline SVG so it inherits theme colours and stays crisp at every size.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7", className)}>
      <rect width="32" height="32" rx="9" className="fill-foreground" />
      <path
        d="M15 5c.9 6.4 3.6 9.1 10 10-6.4.9-9.1 3.6-10 10-.9-6.4-3.6-9.1-10-10 6.4-.9 9.1-3.6 10-10Z"
        className="fill-background"
      />
      <circle cx="24.5" cy="7.5" r="2.5" className="fill-hot" />
    </svg>
  );
}

export function BrandMark({
  href = "/",
  compact = false,
  className,
}: {
  href?: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="skaddosh home"
      className={cn("inline-flex min-w-0 items-center gap-2 transition-opacity hover:opacity-80", className)}
    >
      <LogoMark />
      {!compact ? (
        <span className="truncate font-display text-[1.6rem] leading-none tracking-tight text-foreground">skaddosh</span>
      ) : null}
    </Link>
  );
}
