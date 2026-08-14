"use client";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
          <p className="mb-3 text-sm font-medium text-muted-foreground">500</p>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight">Something went wrong</h1>
          <p className="mb-6 text-sm text-muted-foreground">{error.message || "An unexpected error occurred."}</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
