import type { BridgeIntent } from "@/lib/types";
import { getEnv } from "@/lib/config/env";
import { parseLooseAmount } from "@/lib/utils/money";

const NETWORK_ALIASES = new Map<string, string>([
  ["ethereum", "ethereum"],
  ["eth", "ethereum"],
  ["arbitrum", "arbitrum"],
  ["arb", "arbitrum"],
  ["optimism", "optimism"],
  ["op", "optimism"],
  ["polygon", "polygon"],
  ["matic", "polygon"],
  ["solana", "solana"],
  ["sol", "solana"],
  ["ton", "ton"],
  ["tron", "tron"],
]);

function normalizeNetworkName(value: string | undefined) {
  if (!value) {
    return "";
  }

  return NETWORK_ALIASES.get(value.trim().toLowerCase()) ?? "";
}

function extractPurpose(rawRequest: string) {
  const match = rawRequest.match(/\bfor\s+(.+)$/i);
  return match?.[1]?.trim() ?? "Treasury routing";
}

function extractRecipientAddress(rawRequest: string) {
  const evmMatch = rawRequest.match(/\b(0x[a-fA-F0-9]{40})\b/);

  if (evmMatch) {
    return evmMatch[1];
  }

  const recipientMatch = rawRequest.match(/\brecipient\s+([A-Za-z0-9:_-]{24,})\b/i);
  return recipientMatch?.[1] ?? "";
}

function isValidRecipientForNetwork(network: string, recipientAddress: string) {
  if (!recipientAddress) {
    return false;
  }

  switch (network) {
    case "solana":
      return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(recipientAddress);
    case "ton":
    case "tron":
      return recipientAddress.length >= 10;
    default:
      return /^0x[a-fA-F0-9]{40}$/.test(recipientAddress);
  }
}

export function parseBridgeRequest(rawRequest: string, defaultRecipientAddress: string): BridgeIntent {
  const env = getEnv();
  const amount = parseLooseAmount(rawRequest);
  const assetMatch = rawRequest.match(/\b(USDT0|USDt0|USDT|USDt|USD₮0|USD₮|XAUT0|XAUt0)\b/i);
  const fromMatch = rawRequest.match(/\bfrom\s+([A-Za-z0-9]+)\b/i);
  const toMatch = rawRequest.match(/\bto\s+([A-Za-z0-9]+)\b/i);
  const sourceNetwork = normalizeNetworkName(fromMatch?.[1]) || env.wdkBridgeSourceNetwork;
  const destinationNetwork = normalizeNetworkName(toMatch?.[1]);
  const explicitRecipientAddress = extractRecipientAddress(rawRequest);
  const recipientAddress =
    explicitRecipientAddress ||
    (destinationNetwork && ["solana", "ton", "tron"].includes(destinationNetwork)
      ? ""
      : defaultRecipientAddress);
  const ambiguous =
    amount <= 0 ||
    !sourceNetwork ||
    !destinationNetwork ||
    !isValidRecipientForNetwork(destinationNetwork, recipientAddress);

  return {
    sourceNetwork,
    destinationNetwork,
    recipientAddress,
    asset:
      assetMatch?.[1]
        ?.replace("USDT0", "USDt0")
        ?.replace("USDT", "USDt")
        ?.replace("USD₮0", "USDt0")
        ?.replace("USD₮", "USDt") ?? env.wdkBridgeAssetSymbol,
    amount,
    purpose: extractPurpose(rawRequest),
    memo: rawRequest,
    confidence: ambiguous ? 0.44 : 0.92,
    ambiguous,
  };
}
