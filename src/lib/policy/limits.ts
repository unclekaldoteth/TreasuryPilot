import type { TreasuryPolicy } from "@/lib/types";

export function isAboveAutoApprovalLimit(amount: number, policy: TreasuryPolicy) {
  return amount > policy.autoApprovalLimit;
}

export function exceedsPerTransactionLimit(amount: number, policy: TreasuryPolicy) {
  return amount > policy.perTxLimit;
}
