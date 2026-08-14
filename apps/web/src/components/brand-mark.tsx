import Link from "next/link";
import { cn } from "@skaddosh/ui/lib/utils";

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
      className={cn("inline-flex min-w-0 items-center transition-opacity hover:opacity-85", className)}
    >
      <span className="relative flex size-7 shrink-0 items-center -mr-0.5 justify-center overflow-hidden">
        <img
          src="/brand/logo.png"
          alt=""
          className="h-full w-full object-contain bg-transparent"
          aria-hidden="true"
        />
      </span>
      {!compact ? (
        <span className="flex min-w-0 flex-col leading-none">
          <span className="truncate font-display text-lg font-semibold tracking-tight text-foreground">
            skaddosh
          </span>
        </span>
      ) : null}
    </Link>
  );
}
