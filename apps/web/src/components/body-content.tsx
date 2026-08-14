import { cn } from "@skaddosh/ui/lib/utils";
import type { Lang } from "@skaddosh/db/schema";

const IMAGE_BLOCK_RE = /^!\[([^\]]*)\]\((\S+)\)$/;

export function BodyContent({ text, lang, accent }: { text: string; lang: Lang; accent: string }) {
  const rtl = lang === "ar";
  return (
    <div
      className={cn(
        "space-y-5",
        rtl ? "font-arabic text-[1.15rem] leading-[2.1] text-right" : "font-display text-[1.05rem] leading-[1.9]",
      )}
      dir={rtl ? "rtl" : "ltr"}
    >
      {text.trim().split(/\n{2,}/).map((block, i) => {
        const b = block.trim();
        if (!b) return null;

        const image = b.match(IMAGE_BLOCK_RE);
        if (image) {
          const [, alt, src] = image;
          return (
            <figure key={i} className="overflow-hidden rounded-xl border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} className="h-auto w-full object-cover" />
              {alt ? (
                <figcaption className="px-3 py-2 text-xs text-muted-foreground">{alt}</figcaption>
              ) : null}
            </figure>
          );
        }

        if (b.startsWith("—") || b.startsWith("«")) {
          return (
            <blockquote
              key={i}
              className={cn("rounded-lg bg-muted/50 py-3 px-4 italic text-muted-foreground", rtl ? "border-r-2" : "border-l-2")}
              style={{ borderColor: accent }}
            >
              <p>{b}</p>
            </blockquote>
          );
        }

        const parts = b.split(/(\*[^*]+\*)/g);
        return (
          <p key={i} className="text-foreground/90">
            {parts.map((pt, j) =>
              pt.startsWith("*") && pt.endsWith("*") ? (
                <em key={j} className="not-italic font-semibold" style={{ color: accent }}>
                  {pt.slice(1, -1)}
                </em>
              ) : (
                pt
              ),
            )}
          </p>
        );
      })}
    </div>
  );
}
