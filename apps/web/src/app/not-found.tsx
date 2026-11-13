import Link from "next/link";
import { LogoMark } from "@/components/brand-mark";

export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <LogoMark className="size-10" />
      <h1 className="mt-6 font-display text-5xl tracking-tight">Nothing hangs here</h1>
      <p className="mt-3 text-sm text-muted-foreground">This page doesn&apos;t exist, or it was taken down.</p>
      <Link href="/" className="mt-8 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">
        Back to the gallery
      </Link>
    </main>
  );
}
