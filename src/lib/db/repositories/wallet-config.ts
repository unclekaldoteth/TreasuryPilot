import { db } from "@/lib/db/client";
import type { WalletSummary } from "@/lib/types";

export async function getLatestWalletConfig() {
  return db.walletConfig.findFirst({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function saveWalletConfig(input: {
  network: string;
  walletType: string;
  publicAddress: string;
  encryptedSeed: string;
}) {
  const existing = await getLatestWalletConfig();

  if (existing) {
    return db.walletConfig.update({
      where: {
        id: existing.id,
      },
      data: input,
    });
  }

  return db.walletConfig.create({
    data: input,
  });
}

export function mapWalletConfigToSummary(input: {
  network: string;
  publicAddress: string;
  asset: string;
  walletType: string;
}): WalletSummary {
  return {
    network: input.network,
    address: input.publicAddress,
    asset: input.asset,
    balance: "unfetched",
    status: "connected",
    walletType: input.walletType,
  };
}
