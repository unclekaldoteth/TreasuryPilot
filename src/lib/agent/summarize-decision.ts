import type { PaymentIntent, PolicyEvaluation } from "@/lib/types";

export function summarizeDecision(intent: PaymentIntent, evaluation: PolicyEvaluation) {
  return {
    headline: `${evaluation.decision.toUpperCase()}: ${intent.recipientName}`,
    explanation: evaluation.reason,
  };
}
