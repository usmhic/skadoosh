import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@skaddosh/api";
import { auth } from "@skaddosh/auth/server";
import { headers } from "next/headers";
import type { NextRequest } from "next/server";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint:   "/api/trpc",
    req,
    router:     appRouter,
    createContext: async () => ({
      session: await auth.api.getSession({ headers: await headers() }),
    }),
    onError: ({ error, path, type }) => {
      console.error("[trpc]", {
        path,
        type,
        code: error.code,
        message: error.message,
        cause: error.cause,
      });
    },
  });

export { handler as GET, handler as POST };
