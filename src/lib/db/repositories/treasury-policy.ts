import { db } from "@/lib/db/client";
import type { TreasuryPolicy } from "@/lib/types";

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
    throw new Error("Treasury policy is missing. Run the Prisma seed before accepting payment requests.");
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
