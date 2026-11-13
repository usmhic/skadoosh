"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/provider";
import { Button } from "@skaddosh/ui/components/ui/button";
import { Input } from "@skaddosh/ui/components/ui/input";
import { ArrowDownIcon, ArrowUpIcon, ArrowUpRightIcon, Loader2Icon, WalletIcon } from "lucide-react";
import { ActionError } from "@/components/action-error";
import { KudosMark, timeAgo } from "./kudos-ui";

type Eip1193 = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };

function browserWallet(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { ethereum?: Eip1193 }).ethereum ?? null) as Eip1193 | null;
}

async function switchChain(wallet: Eip1193, chainId: number) {
  try {
    await wallet.request({ method: "wallet_switchEthereumChain", params: [{ chainId: `0x${chainId.toString(16)}` }] });
  } catch {
    // The wallet will ask the person to switch when it signs; nothing else to do here.
  }
}

/**
 * Optional: hold Kudos in your own wallet as a token on Base. Shown only when on-chain Kudos are
 * enabled. Everything else on skaddosh works without it.
 */
export function OnchainPanel() {
  const utils = trpc.useUtils();
  const config = trpc.chain.config.useQuery();
  const status = trpc.chain.status.useQuery(undefined, { enabled: config.data?.enabled === true });
  const [amount, setAmount] = useState(10);
  const [busy, setBusy] = useState<"link" | "export" | "import" | null>(null);
  const [error, setError] = useState<{ message: string; data?: { code?: string } } | null>(null);

  const challenge = trpc.chain.walletChallenge.useMutation();
  const link = trpc.chain.linkWallet.useMutation();
  const unlink = trpc.chain.unlinkWallet.useMutation({ onSuccess: () => status.refetch() });
  const exportKudos = trpc.chain.exportKudos.useMutation();
  const permitData = trpc.chain.permitData.useMutation();
  const importKudos = trpc.chain.importKudos.useMutation();

  if (!config.data?.enabled) return null;
  const s = status.data;
  const refresh = () => Promise.all([status.refetch(), utils.kudos.wallet.invalidate(), utils.kudos.history.invalidate()]);

  const run = async (kind: "link" | "export" | "import", fn: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e as { message: string; data?: { code?: string } });
    } finally {
      setBusy(null);
    }
  };

  const linkWallet = () =>
    run("link", async () => {
      const wallet = browserWallet();
      if (!wallet) throw new Error("No browser wallet found. Install a wallet app such as Coinbase Wallet or MetaMask.");
      const [address] = (await wallet.request({ method: "eth_requestAccounts" })) as string[];
      if (!address) throw new Error("No account selected.");
      const { message, issuedAt } = await challenge.mutateAsync({ address });
      const signature = (await wallet.request({ method: "personal_sign", params: [message, address] })) as string;
      await link.mutateAsync({ address, issuedAt, signature });
    });

  const sendToWallet = () => run("export", async () => void (await exportKudos.mutateAsync({ amount })));

  const bringBack = () =>
    run("import", async () => {
      const wallet = browserWallet();
      if (!wallet || !s?.wallet) throw new Error("Connect the linked wallet in your browser first.");
      const typed = await permitData.mutateAsync({ amount });
      await switchChain(wallet, typed.domain.chainId);
      const payload = {
        ...typed,
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          ...typed.types,
        },
      };
      const signature = (await wallet.request({
        method: "eth_signTypedData_v4",
        params: [s.wallet, JSON.stringify(payload)],
      })) as string;
      await importKudos.mutateAsync({ amount, deadline: typed.message.deadline, signature });
    });

  return (
    <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-muted">
          <WalletIcon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-3xl">Kudos in your own wallet</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
            Optional. Move Kudos to a wallet you control, where they&apos;re a token on {config.data.chainName}. Bring them back
            any time. We pay the network fees.
          </p>
        </div>
        {s?.onchainBalance != null ? (
          <div className="text-right">
            <p className="font-display text-4xl tabular-nums">{s.onchainBalance}</p>
            <p className="text-xs text-muted-foreground">in your wallet</p>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        {!s ? (
          <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
        ) : !s.wallet ? (
          s.reason && !/wallet/i.test(s.reason) ? (
            <p className="text-sm text-muted-foreground">
              {s.reason}{" "}
              {/verify/i.test(s.reason) ? (
                <Link href="/welcome?step=verify" className="font-medium text-foreground underline underline-offset-2">
                  Verify now
                </Link>
              ) : null}
            </p>
          ) : (
            <Button className="rounded-full" disabled={busy !== null} onClick={linkWallet}>
              {busy === "link" ? <Loader2Icon className="size-4 animate-spin" /> : <WalletIcon className="size-4" />}
              Link a wallet
            </Button>
          )
        ) : (
          <div className="space-y-4">
            <p className="flex flex-wrap items-center gap-2 text-sm">
              Linked: <span className="font-mono text-xs">{s.wallet.slice(0, 6)}…{s.wallet.slice(-4)}</span>
              <button className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => unlink.mutate()}>
                Unlink
              </button>
            </p>
            {s.eligible ? (
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex h-10 items-center gap-2 rounded-full border border-border px-3">
                  <KudosMark size="xs" />
                  <Input
                    type="number"
                    min={1}
                    max={1000}
                    value={amount}
                    onChange={(e) => setAmount(Math.max(1, Math.min(1000, Math.floor(Number(e.target.value) || 1))))}
                    className="h-8 w-20 border-0 p-0 shadow-none focus-visible:ring-0"
                    aria-label="Amount"
                  />
                </div>
                <Button variant="outline" className="rounded-full" disabled={busy !== null} onClick={sendToWallet}>
                  {busy === "export" ? <Loader2Icon className="size-4 animate-spin" /> : <ArrowUpIcon className="size-4" />}
                  Send to wallet
                </Button>
                <Button variant="outline" className="rounded-full" disabled={busy !== null} onClick={bringBack}>
                  {busy === "import" ? <Loader2Icon className="size-4 animate-spin" /> : <ArrowDownIcon className="size-4" />}
                  Bring back
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{s.reason}</p>
            )}
          </div>
        )}
        <div className="mt-4">
          <ActionError error={error} />
        </div>
      </div>

      {s?.operations.length ? (
        <ul className="mt-6 divide-y divide-border border-t border-border text-sm">
          {s.operations.map((op) => (
            <li key={op.id} className="flex items-center gap-3 py-3">
              {op.kind === "export" ? <ArrowUpIcon className="size-4 text-muted-foreground" /> : <ArrowDownIcon className="size-4 text-muted-foreground" />}
              <span className="flex-1">
                {op.kind === "export" ? "Sent to wallet" : "Brought back"} · {op.amount} · {timeAgo(op.createdAt)}
              </span>
              <span className={op.status === "failed" ? "text-destructive" : "text-muted-foreground"}>
                {op.status === "confirmed" ? "Done" : op.status === "failed" ? "Didn't go through (refunded)" : "Processing"}
              </span>
              {op.explorerUrl ? (
                <a href={op.explorerUrl} target="_blank" rel="noopener noreferrer" aria-label="View on explorer">
                  <ArrowUpRightIcon className="size-4 text-muted-foreground" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
