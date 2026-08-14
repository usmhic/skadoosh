"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "@skaddosh/api";

type TrpcClient = ReturnType<typeof createTRPCReact<AppRouter>>;
export const trpc: TrpcClient = createTRPCReact<AppRouter>();

export function TRPCProvider({ children }: { children: any }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60 * 1000 } } }));
  const [tc] = useState(() =>
    trpc.createClient({
      links: [httpBatchLink({
        url: typeof window !== "undefined"
          ? `${window.location.origin}/api/trpc`
          : `${process.env.NEXT_PUBLIC_APP_URL ?? process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/api/trpc`,
        transformer: superjson,
      })],
    })
  );
  return (
    <trpc.Provider client={tc} queryClient={qc}>
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
