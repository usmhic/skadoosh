import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import superjson from "superjson";
import type { AppRouter } from "@skaddosh/api";
import { mobileConfig } from "@/config/mobile-env";
import { getAuthCookie } from "@/lib/auth";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: mobileConfig.trpcUrl,
      transformer: superjson,
      headers() {
        const cookie = getAuthCookie();
        return cookie ? { cookie } : {};
      },
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "omit",
        } as RequestInit);
      },
    }),
  ],
});
