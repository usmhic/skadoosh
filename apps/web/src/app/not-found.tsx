export default function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="mb-3 text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">The page you requested does not exist.</p>
    </main>
  );
}
