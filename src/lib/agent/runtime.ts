import { parsePaymentRequest } from "@/lib/agent/parse-payment-request";
import { summarizeDecision } from "@/lib/agent/summarize-decision";
import { getLatestTreasuryPolicy } from "@/lib/db/repositories/treasury-policy";
import { listStoredVendors } from "@/lib/db/repositories/vendors";
import { evaluatePolicy } from "@/lib/policy/engine";

export async function preparePaymentRequest(rawRequest: string) {
  const [policy, vendors] = await Promise.all([getLatestTreasuryPolicy(), listStoredVendors()]);
  const intent = parsePaymentRequest(rawRequest, vendors);
  const evaluation = evaluatePolicy(intent, policy, vendors);
  const summary = summarizeDecision(intent, evaluation);

  return { intent, evaluation, summary };
}
