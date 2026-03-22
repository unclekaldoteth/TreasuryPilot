import { db } from "@/lib/db/client";
import type { TreasuryPolicy } from "@/lib/types";

export const DEFAULT_TREASURY_POLICY: TreasuryPolicy = {
  perTxLimit: 2500,
  dailyLimit: 5000,
  weeklyLimit: 15000,
  autoApprovalLimit: 500,
  allowedAssets: ["USDt"],
  allowedCategories: ["contractor", "software", "operations", "revenue-share"],
  requireAllowlist: true,
  paused: false,
};

function parseStringArray(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is string => typeof entry === "string");
    }
  } catch {
    return [];
  }

  return [];
}

export async function getLatestTreasuryPolicy(): Promise<TreasuryPolicy> {
  const policy = await db.treasuryPolicy.findFirst({
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!policy) {
    return DEFAULT_TREASURY_POLICY;
  }

  return {
    perTxLimit: policy.perTxLimit,
    dailyLimit: policy.dailyLimit,
    weeklyLimit: policy.weeklyLimit,
    autoApprovalLimit: policy.autoApprovalLimit,
    allowedAssets: parseStringArray(policy.allowedAssets),
    allowedCategories: parseStringArray(policy.allowedCategories),
    requireAllowlist: policy.requireAllowlist,
    paused: policy.paused,
  };
}
