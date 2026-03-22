import type { PaymentIntent, Vendor } from "@/lib/types";
import { parseLooseAmount } from "@/lib/utils/money";

function inferCategory(input: string) {
  const lower = input.toLowerCase();

  if (lower.includes("design") || lower.includes("contractor")) {
    return "contractor";
  }

  if (lower.includes("infra") || lower.includes("server") || lower.includes("vps")) {
    return "operations";
  }

  if (lower.includes("subscription") || lower.includes("renew")) {
    return "software";
  }

  return "operations";
}

export function parsePaymentRequest(rawRequest: string, vendors: Vendor[]): PaymentIntent {
  const amount = parseLooseAmount(rawRequest);
  const assetMatch = rawRequest.match(/\b(USDT|USDt|USD₮)\b/i);
  const vendor = vendors.find((candidate) => rawRequest.toLowerCase().includes(candidate.name.toLowerCase()));
  const addressMatch = rawRequest.match(/0x[a-fA-F0-9]{6,}/);
  const recipientAddress = vendor?.walletAddress ?? addressMatch?.[0] ?? "";
  const recipientName = vendor?.name ?? "Unresolved recipient";
  const ambiguous = amount <= 0 || recipientAddress.length === 0;

  return {
    recipientName,
    recipientAddress,
    asset: assetMatch?.[1]?.replace("USDT", "USDt") ?? "USDt",
    amount,
    category: inferCategory(rawRequest),
    memo: rawRequest,
    confidence: ambiguous ? 0.42 : 0.91,
    ambiguous,
  };
}
