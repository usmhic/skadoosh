/**
 * On-chain integration (Base). Server-only.
 *
 * Everything here is optional: when CHAIN_ENABLED is not "true", or the contracts aren't
 * configured, `chainConfig()` reports why and every on-chain feature stays off. The app works
 * fully without a chain. See docs/CHAIN.md.
 */
import { createHmac } from "node:crypto";
import {
  createPublicClient,
  createWalletClient,
  getAddress,
  http,
  isAddress,
  keccak256,
  toHex,
  type Address,
  type Chain,
  type Hash,
  type PublicClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia, foundry } from "viem/chains";
import { creativeRegistryAbi, kudosTokenAbi } from "@skaddosh/contracts/abi";

const CHAINS: Record<number, Chain> = {
  [base.id]: base,
  [baseSepolia.id]: baseSepolia,
  [foundry.id]: foundry,
};

export const KUDOS_DECIMALS = 18n;
export const KUDO_UNIT = 10n ** KUDOS_DECIMALS;

export type ChainConfig =
  | { enabled: false; reason: string }
  | {
      enabled: true;
      chain: Chain;
      rpcUrl: string;
      token: Address;
      registry: Address;
      operatorKey: `0x${string}`;
      operator: Address;
      allowedCountries: Set<string>;
      explorer: string | null;
    };

let cached: ChainConfig | undefined;

/** Parse and validate chain configuration once. Never throws: misconfiguration disables the chain. */
export function chainConfig(): ChainConfig {
  if (cached) return cached;
  cached = readConfig();
  if (!cached.enabled && process.env.CHAIN_ENABLED === "true") {
    console.warn(`[skaddosh] On-chain features disabled: ${cached.reason}`);
  }
  return cached;
}

/** Test hook: forget the cached configuration. */
export function resetChainConfig() {
  cached = undefined;
  clients = undefined;
}

function readConfig(): ChainConfig {
  if (process.env.CHAIN_ENABLED !== "true") return { enabled: false, reason: "CHAIN_ENABLED is not true" };
  const chainId = Number(process.env.CHAIN_ID);
  const chain = CHAINS[chainId];
  if (!chain) return { enabled: false, reason: `Unsupported CHAIN_ID ${process.env.CHAIN_ID ?? "(unset)"}` };
  const rpcUrl = process.env.CHAIN_RPC_URL;
  if (!rpcUrl) return { enabled: false, reason: "CHAIN_RPC_URL is not set" };
  const token = process.env.KUDOS_TOKEN_ADDRESS;
  const registry = process.env.CREATIVE_REGISTRY_ADDRESS;
  if (!token || !isAddress(token)) return { enabled: false, reason: "KUDOS_TOKEN_ADDRESS is missing or invalid" };
  if (!registry || !isAddress(registry)) {
    return { enabled: false, reason: "CREATIVE_REGISTRY_ADDRESS is missing or invalid" };
  }
  const operatorKey = process.env.CHAIN_OPERATOR_PRIVATE_KEY;
  if (!operatorKey || !/^0x[0-9a-fA-F]{64}$/.test(operatorKey)) {
    return { enabled: false, reason: "CHAIN_OPERATOR_PRIVATE_KEY is missing or invalid" };
  }
  if (!process.env.CHAIN_REF_SALT) return { enabled: false, reason: "CHAIN_REF_SALT is not set" };
  const allowedCountries = new Set(
    (process.env.CHAIN_ALLOWED_COUNTRIES ?? "")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter((c) => /^[A-Z]{2}$/.test(c)),
  );
  return {
    enabled: true,
    chain,
    rpcUrl,
    token: getAddress(token),
    registry: getAddress(registry),
    operatorKey: operatorKey as `0x${string}`,
    operator: privateKeyToAccount(operatorKey as `0x${string}`).address,
    allowedCountries,
    explorer: chain.blockExplorers?.default.url ?? null,
  };
}

type Clients = {
  publicClient: PublicClient;
  walletClient: ReturnType<typeof createWalletClient>;
  config: Extract<ChainConfig, { enabled: true }>;
};
let clients: Clients | undefined;

export function chainClients(): Clients {
  const config = chainConfig();
  if (!config.enabled) throw new Error(`On-chain features are disabled: ${config.reason}`);
  if (clients) return clients;
  const transport = http(config.rpcUrl, { retryCount: 2, timeout: 15_000 });
  clients = {
    config,
    publicClient: createPublicClient({ chain: config.chain, transport }) as PublicClient,
    walletClient: createWalletClient({ chain: config.chain, transport, account: privateKeyToAccount(config.operatorKey) }),
  };
  return clients;
}

// ── References (hashes only — never personal data on-chain) ─────────────────

/** Deterministic on-chain id for a skaddosh record id (project, licence, contribution, ledger op). */
export function recordRef(id: string): Hash {
  return keccak256(toHex(`skaddosh:${id}`));
}

/** Salted hash of an account id. The salt is secret so refs can't be linked back to accounts. */
export function accountRef(userId: string): Hash {
  const salt = process.env.CHAIN_REF_SALT ?? "";
  return `0x${createHmac("sha256", salt).update(userId).digest("hex")}` as Hash;
}

/** 0x-prefixed form of a hex SHA-256 digest, for bytes32 contract arguments. */
export function hexDigest(sha256Hex: string): Hash {
  return `0x${sha256Hex.replace(/^0x/, "")}` as Hash;
}

export function explorerTxUrl(txHash: string | null | undefined): string | null {
  const config = chainConfig();
  if (!txHash || !config.enabled || !config.explorer) return null;
  return `${config.explorer}/tx/${txHash}`;
}

// ── Contract calls ──────────────────────────────────────────────────────────

/** Serialise sends from this process so concurrent requests don't race the operator's nonce. */
let sendQueue: Promise<unknown> = Promise.resolve();
function serialised<T>(fn: () => Promise<T>): Promise<T> {
  const next = sendQueue.then(fn, fn);
  sendQueue = next.catch(() => undefined);
  return next;
}

export const LICENSE_TIER_INDEX = { personal: 0, commercial: 1, exclusive: 2 } as const;

export type ChainCall =
  | { fn: "mint"; to: Address; amount: number; ref: Hash }
  | { fn: "redeemWithPermit"; from: Address; amount: number; ref: Hash; deadline: bigint; v: number; r: Hash; s: Hash }
  | { fn: "registerWork"; workId: Hash; contentHash: Hash; creatorRef: Hash }
  | { fn: "recordContribution"; contributionId: Hash; workId: Hash; contributorRef: Hash; splitBps: number; agreementHash: Hash }
  | { fn: "revokeContribution"; contributionId: Hash }
  | { fn: "issueLicense"; licenseId: Hash; workId: Hash; licenseeRef: Hash; tier: keyof typeof LICENSE_TIER_INDEX; termsHash: Hash }
  | { fn: "revokeLicense"; licenseId: Hash };

/** Submit one contract call from the operator account and return its transaction hash. */
export function submit(call: ChainCall): Promise<Hash> {
  const { walletClient, config } = chainClients();
  const account = walletClient.account!;
  const chain = config.chain;
  return serialised(async () => {
    switch (call.fn) {
      case "mint":
        return walletClient.writeContract({
          account, chain, address: config.token, abi: kudosTokenAbi, functionName: "mint",
          args: [call.to, BigInt(call.amount) * KUDO_UNIT, call.ref],
        });
      case "redeemWithPermit":
        return walletClient.writeContract({
          account, chain, address: config.token, abi: kudosTokenAbi, functionName: "redeemWithPermit",
          args: [call.from, BigInt(call.amount) * KUDO_UNIT, call.ref, call.deadline, call.v, call.r, call.s],
        });
      case "registerWork":
        return walletClient.writeContract({
          account, chain, address: config.registry, abi: creativeRegistryAbi, functionName: "registerWork",
          args: [call.workId, call.contentHash, call.creatorRef],
        });
      case "recordContribution":
        return walletClient.writeContract({
          account, chain, address: config.registry, abi: creativeRegistryAbi, functionName: "recordContribution",
          args: [call.contributionId, call.workId, call.contributorRef, call.splitBps, call.agreementHash],
        });
      case "revokeContribution":
        return walletClient.writeContract({
          account, chain, address: config.registry, abi: creativeRegistryAbi, functionName: "revokeContribution",
          args: [call.contributionId],
        });
      case "issueLicense":
        return walletClient.writeContract({
          account, chain, address: config.registry, abi: creativeRegistryAbi, functionName: "issueLicense",
          args: [call.licenseId, call.workId, call.licenseeRef, LICENSE_TIER_INDEX[call.tier], call.termsHash],
        });
      case "revokeLicense":
        return walletClient.writeContract({
          account, chain, address: config.registry, abi: creativeRegistryAbi, functionName: "revokeLicense",
          args: [call.licenseId],
        });
    }
  });
}

/** Wait for a receipt. Returns null on timeout so callers can leave the operation for reconcile. */
export async function waitForTx(hash: Hash, timeoutMs = 20_000): Promise<"success" | "reverted" | null> {
  const { publicClient } = chainClients();
  try {
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: timeoutMs });
    return receipt.status;
  } catch {
    return null;
  }
}

/** Look up a receipt without waiting. */
export async function txStatus(hash: Hash): Promise<"success" | "reverted" | null> {
  const { publicClient } = chainClients();
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash });
    return receipt.status;
  } catch {
    return null;
  }
}

/** EIP-712 typed data the holder signs to return Kudos gaslessly (EIP-2612 permit). */
export async function permitTypedData(owner: Address, amount: number, deadline: bigint) {
  const { publicClient, config } = chainClients();
  const nonce = await publicClient.readContract({
    address: config.token,
    abi: kudosTokenAbi,
    functionName: "nonces",
    args: [owner],
  });
  return {
    domain: { name: "Kudos", version: "1", chainId: config.chain.id, verifyingContract: config.token },
    types: {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit" as const,
    message: {
      owner,
      spender: config.operator,
      value: (BigInt(amount) * KUDO_UNIT).toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    },
  };
}

/** On-chain KUDOS balance of an address, in whole Kudos (rounded down). */
export async function onchainBalance(owner: Address): Promise<number> {
  const { publicClient, config } = chainClients();
  const raw = await publicClient.readContract({
    address: config.token,
    abi: kudosTokenAbi,
    functionName: "balanceOf",
    args: [owner],
  });
  return Number(raw / KUDO_UNIT);
}
