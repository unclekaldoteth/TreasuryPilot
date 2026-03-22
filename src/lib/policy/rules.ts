import type { PaymentIntent, PolicyRuleResult, TreasuryPolicy, Vendor } from "@/lib/types";
import { exceedsPerTransactionLimit, isAboveAutoApprovalLimit } from "@/lib/policy/limits";

export function runPolicyRules(intent: PaymentIntent, policy: TreasuryPolicy, vendors: Vendor[]): PolicyRuleResult[] {
  const matchingVendor = vendors.find((vendor) => vendor.walletAddress === intent.recipientAddress);

  return [
    {
      rule: "policy_not_paused",
      passed: !policy.paused,
      detail: policy.paused ? "Treasury is currently paused." : "Treasury is active.",
    },
    {
      rule: "asset_supported",
      passed: policy.allowedAssets.includes(intent.asset),
      detail: policy.allowedAssets.includes(intent.asset)
        ? `${intent.asset} is allowed.`
        : `${intent.asset} is not in the allowed asset set.`,
    },
    {
      rule: "recipient_not_blocked",
      passed: !matchingVendor?.isBlocked,
      detail: matchingVendor?.isBlocked ? "Recipient is blocked by treasury policy." : "Recipient is not blocked.",
    },
    {
      rule: "allowlist_check",
      passed: policy.requireAllowlist ? Boolean(matchingVendor?.isAllowlisted) : true,
      detail:
        policy.requireAllowlist && !matchingVendor?.isAllowlisted
          ? "Recipient is not on the allowlist."
          : "Allowlist check passed.",
    },
    {
      rule: "category_allowed",
      passed: policy.allowedCategories.includes(intent.category),
      detail: policy.allowedCategories.includes(intent.category)
        ? `Category ${intent.category} is approved.`
        : `Category ${intent.category} is not allowed.`,
    },
    {
      rule: "per_transaction_limit",
      passed: !exceedsPerTransactionLimit(intent.amount, policy),
      detail: exceedsPerTransactionLimit(intent.amount, policy)
        ? `Amount ${intent.amount} exceeds the per-transaction cap.`
        : "Amount is within the per-transaction cap.",
    },
    {
      rule: "auto_approval_threshold",
      passed: !isAboveAutoApprovalLimit(intent.amount, policy),
      detail: isAboveAutoApprovalLimit(intent.amount, policy)
        ? "Amount exceeds the auto-approval threshold."
        : "Amount is within the auto-approval threshold.",
    },
  ];
}
