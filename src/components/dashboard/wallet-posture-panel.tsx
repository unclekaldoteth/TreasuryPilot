"use client";

import { startTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import type { WalletBalanceSnapshot } from "@/lib/wallet/types";

type WalletPosturePanelProps = {
  wallet: WalletBalanceSnapshot;
};

export function WalletPosturePanel({ wallet }: WalletPosturePanelProps) {
  const router = useRouter();
  const [isInitializing, setIsInitializing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function handleInitializeWallet() {
    setIsInitializing(true);
    setActionError(null);

    try {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Wallet initialization failed.");
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Wallet initialization failed.");
    } finally {
      setIsInitializing(false);
    }
  }

  return (
    <>
      <dl className="grid gap-3 text-sm text-[var(--muted)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <dt>Network</dt>
          <dd className="font-medium text-[var(--ink)]">{wallet.network}</dd>
        </div>
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <dt>Address</dt>
          <dd className="max-w-[22rem] truncate text-right font-medium text-[var(--ink)]">
            {wallet.address || "Wallet not initialized"}
          </dd>
        </div>
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3">
          <dt>Token balance</dt>
          <dd className="font-medium text-[var(--ink)]">
            {wallet.status === "error" ? "Unavailable" : `${wallet.balance} ${wallet.asset}`}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Status</dt>
          <dd>
            <StatusPill label={wallet.status} />
          </dd>
        </div>
      </dl>

      {wallet.status === "missing" ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm leading-6 text-[var(--muted)]">
            Initialize the treasury wallet to generate and persist the ERC-4337 account used by the demo.
          </p>
          <button
            type="button"
            onClick={handleInitializeWallet}
            disabled={isInitializing}
            className="rounded-full bg-[var(--navy)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#10273c] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isInitializing ? "Initializing..." : "Initialize wallet"}
          </button>
        </div>
      ) : null}

      {wallet.status === "error" ? (
        <p className="mt-4 text-sm leading-6 text-[var(--muted)]">
          Wallet configuration already exists, but the runtime could not load it cleanly. Resolve the current error
          before attempting any reinitialization.
        </p>
      ) : null}

      {actionError ? <p className="mt-4 text-sm leading-6 text-[var(--rose)]">{actionError}</p> : null}
      {wallet.error ? <p className="mt-4 text-sm leading-6 text-[var(--rose)]">{wallet.error}</p> : null}
    </>
  );
}
