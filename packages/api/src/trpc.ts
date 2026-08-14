import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Session } from "@skaddosh/auth/server";

export type Context = { session: Session | null };

const t = initTRPC.context<Context>().create({ transformer: superjson });

export const router          = t.router;
export const publicProcedure = t.procedure;

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return next({ ctx: { session: ctx.session } });
});

const enforceCreator = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  if (!ctx.session.user.username) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Set a username in your profile before creating content.",
    });
  }
  return next({ ctx: { session: ctx.session! } });
});

export const protectedProcedure = t.procedure.use(enforceAuth);
export const creatorProcedure   = t.procedure.use(enforceCreator);
