import { createHmac } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { getAddress, isAddress, keccak256, parseSignature, verifyMessage } from "viem";
import { chainOperation, db, user } from "@skaddosh/db";
import { protectedProcedure, publicProcedure, router } from "../trpc";
import { chainClients, chainConfig, explorerTxUrl, onchainBalance, permitTypedData } from "../lib/chain";
import { enqueueChainOp, processChainOp } from "../lib/chain-ops";
import { identityProvider } from "../lib/identity";
import { KUDOS } from "../lib/kudos-economy";
import { debitHot } from "../lib/kudos-ledger";

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

function challengeNonce(userId: string, address: string, issuedAt: string) {
  return createHmac("sha256", process.env.BETTER_AUTH_SECRET ?? "dev")
    .update(`${userId}|${address.toLowerCase()}|${issuedAt}`)
    .digest("hex")
    .slice(0, 24);
}

function challengeMessage(username: string, address: string, issuedAt: string, nonce: string) {
  return [
    `skaddosh wants you to link this wallet to @${username}.`,
    "",
    "Signing is free and doesn't move any funds.",
    "",
    `Wallet: ${address}`,
    `Issued: ${issuedAt}`,
    `Nonce: ${nonce}`,
  ].join("\n");
}

type Eligibility = { eligible: boolean; reason: string | null };

/** Who may move Kudos on-chain: verified people in allowed jurisdictions with a linked wallet. */
async function eligibility(userId: string): Promise<Eligibility & { wallet: string | null; country: string | null }> {
  const config = chainConfig();
  const [me] = await db
    .select({ status: user.verificationStatus, country: user.verifiedCountry, wallet: user.walletAddress })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const base = { wallet: me?.wallet ?? null, country: me?.country ?? null };
  if (!config.enabled) return { ...base, eligible: false, reason: "On-chain Kudos aren't available yet." };
  if (!identityProvider() || me?.status !== "verified") {
    return { ...base, eligible: false, reason: "Verify your identity to use on-chain Kudos." };
  }
  if (!me.country || !config.allowedCountries.has(me.country)) {
    return { ...base, eligible: false, reason: "On-chain Kudos aren't available in your country yet." };
  }
  if (!me.wallet) return { ...base, eligible: false, reason: "Link a wallet first." };
  return { ...base, eligible: true, reason: null };
}

function opView(op: typeof chainOperation.$inferSelect) {
  return {
    id: op.id,
    kind: op.kind,
    amount: op.amount,
    status: op.status,
    txHash: op.txHash,
    explorerUrl: explorerTxUrl(op.txHash),
    createdAt: op.createdAt,
  };
}

export const chainRouter = router({
  /** Public network info. Never exposes the reason the chain is disabled (it may name env vars). */
  config: publicProcedure.query(() => {
    const config = chainConfig();
    if (!config.enabled) return { enabled: false as const };
    return {
      enabled: true as const,
      chainId: config.chain.id,
      chainName: config.chain.name,
      token: config.token,
      registry: config.registry,
      explorer: config.explorer,
    };
  }),

  status: protectedProcedure.query(async ({ ctx }) => {
    const result = await eligibility(ctx.session.user.id);
    let balance: number | null = null;
    if (result.wallet && chainConfig().enabled) {
      balance = await onchainBalance(getAddress(result.wallet)).catch(() => null);
    }
    const operations = await db
      .select()
      .from(chainOperation)
      .where(and(eq(chainOperation.userId, ctx.session.user.id), inArray(chainOperation.kind, ["export", "import"])))
      .orderBy(desc(chainOperation.createdAt))
      .limit(10);
    return { ...result, enabled: chainConfig().enabled, onchainBalance: balance, operations: operations.map(opView) };
  }),

  walletChallenge: protectedProcedure
    .input(z.object({ address: z.string().refine(isAddress, "Not a valid address") }))
    .mutation(async ({ ctx, input }) => {
      const address = getAddress(input.address);
      const issuedAt = new Date().toISOString();
      const username = ctx.session.user.username ?? ctx.session.user.name ?? "you";
      return {
        issuedAt,
        message: challengeMessage(username, address, issuedAt, challengeNonce(ctx.session.user.id, address, issuedAt)),
      };
    }),

  linkWallet: protectedProcedure
    .input(
      z.object({
        address: z.string().refine(isAddress, "Not a valid address"),
        issuedAt: z.string().datetime(),
        signature: z.string().regex(/^0x[0-9a-fA-F]+$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const address = getAddress(input.address);
      const age = Date.now() - new Date(input.issuedAt).getTime();
      if (age < 0 || age > CHALLENGE_TTL_MS) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "That request expired. Try linking again." });
      }
      const username = ctx.session.user.username ?? ctx.session.user.name ?? "you";
      const nonce = challengeNonce(ctx.session.user.id, address, input.issuedAt);
      const message = challengeMessage(username, address, input.issuedAt, nonce);
      const signature = input.signature as `0x${string}`;
      // With a chain configured, verify through the RPC so smart-contract wallets (ERC-1271/6492) work too.
      const valid = chainConfig().enabled
        ? await chainClients().publicClient.verifyMessage({ address, message, signature }).catch(() => false)
        : await verifyMessage({ address, message, signature }).catch(() => false);
      if (!valid) throw new TRPCError({ code: "BAD_REQUEST", message: "The signature doesn't match this wallet." });

      const lower = address.toLowerCase();
      const [taken] = await db
        .select({ id: user.id })
        .from(user)
        .where(and(eq(user.walletAddress, lower), ne(user.id, ctx.session.user.id)))
        .limit(1);
      if (taken) throw new TRPCError({ code: "CONFLICT", message: "This wallet is linked to another account." });

      await db
        .update(user)
        .set({ walletAddress: lower, walletLinkedAt: new Date(), updatedAt: new Date() })
        .where(eq(user.id, ctx.session.user.id));
      return { ok: true, address };
    }),

  unlinkWallet: protectedProcedure.mutation(async ({ ctx }) => {
    await db
      .update(user)
      .set({ walletAddress: null, walletLinkedAt: null, updatedAt: new Date() })
      .where(eq(user.id, ctx.session.user.id));
    return { ok: true };
  }),

  /** Move Hot Kudos from the app into the linked wallet (mint). */
  exportKudos: protectedProcedure
    .input(z.object({ amount: z.number().int().min(KUDOS.EXPORT_MIN).max(KUDOS.EXPORT_MAX) }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const result = await eligibility(userId);
      if (!result.eligible || !result.wallet) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: result.reason ?? "Not eligible." });
      }
      const opId = await db.transaction(async (tx) => {
        const id = await enqueueChainOp(tx, {
          kind: "export",
          refId: crypto.randomUUID(),
          userId,
          amount: input.amount,
          payload: { to: getAddress(result.wallet!) },
        });
        await debitHot(tx, userId, input.amount, { kind: "export_onchain" });
        return id;
      });
      const op = await processChainOp(opId);
      return op ? opView(op) : null;
    }),

  /** Typed data for the holder to sign so their Kudos can be returned without paying gas. */
  permitData: protectedProcedure
    .input(z.object({ amount: z.number().int().min(KUDOS.EXPORT_MIN).max(KUDOS.EXPORT_MAX) }))
    .mutation(async ({ ctx, input }) => {
      const result = await eligibility(ctx.session.user.id);
      if (!result.eligible || !result.wallet) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: result.reason ?? "Not eligible." });
      }
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 30 * 60);
      return permitTypedData(getAddress(result.wallet), input.amount, deadline);
    }),

  /** Return Kudos from the linked wallet to the app (burn with permit, credit Hot Kudos). */
  importKudos: protectedProcedure
    .input(
      z.object({
        amount: z.number().int().min(KUDOS.EXPORT_MIN).max(KUDOS.EXPORT_MAX),
        deadline: z.string().regex(/^\d+$/),
        signature: z.string().regex(/^0x[0-9a-fA-F]{130}$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const result = await eligibility(userId);
      if (!result.eligible || !result.wallet) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: result.reason ?? "Not eligible." });
      }
      const { r, s, v, yParity } = parseSignature(input.signature as `0x${string}`);
      const opId = await enqueueChainOp(db, {
        kind: "import",
        // One signature can only ever be processed once.
        refId: keccak256(input.signature as `0x${string}`),
        userId,
        amount: input.amount,
        payload: {
          from: getAddress(result.wallet),
          deadline: input.deadline,
          v: Number(v ?? BigInt(27 + (yParity ?? 0))),
          r,
          s,
        },
      });
      const op = await processChainOp(opId);
      return op ? opView(op) : null;
    }),
});

