import Link from "next/link";
import { cn } from "@skaddosh/ui/lib/utils";

/** The skaddosh mark (brand asset in public/brand/mark.png). */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/mark.png" alt="" aria-hidden="true" className={cn("size-7 shrink-0 object-contain", className)} />
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
