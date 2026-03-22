import type { PaymentIntent, PolicyEvaluation, TreasuryPolicy, Vendor } from "@/lib/types";
import { runPolicyRules } from "@/lib/policy/rules";

export function evaluatePolicy(intent: PaymentIntent, policy: TreasuryPolicy, vendors: Vendor[]): PolicyEvaluation {
  const results = runPolicyRules(intent, policy, vendors);
  const failedRules = results.filter((rule) => !rule.passed && rule.rule !== "auto_approval_threshold");
  const needsApproval = results.some((rule) => rule.rule === "auto_approval_threshold" && !rule.passed);

  if (failedRules.length > 0) {
    return {
      decision: "reject",
      reason: failedRules[0]?.detail ?? "Payment request failed one or more policy checks.",
      results,
    };
  }

  if (needsApproval || intent.ambiguous) {
    return {
      decision: "escalate",
      reason: intent.ambiguous
        ? "Parsed request is ambiguous and requires a human review."
        : "Request is valid but exceeds the auto-approval threshold.",
      results,
    };
  }

  return {
    decision: "execute",
    reason: "Request satisfies the configured policy and can be executed automatically.",
    results,
  };
}
