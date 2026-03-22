import type { BridgeIntent, BridgeQuote, PolicyEvaluation } from "@/lib/types";

export type BridgeRequestInput = {
  paymentRequestId: string;
  rawRequest: string;
  requesterLabel?: string;
};

export type VerifiedBridgeRoute = {
  id: string;
  sourceNetwork: string;
  destinationNetwork: string;
  asset: string;
};

export type BridgeFeatureStatus = {
  enabled: boolean;
  executionEnabled: boolean;
  mode: "stub" | "live";
  sourceNetwork: string;
  asset: string;
  supportedRoutes: VerifiedBridgeRoute[];
  verifiedRoutes: VerifiedBridgeRoute[];
  message: string;
};

export type BridgePreparedRequest = {
  intent: BridgeIntent;
  evaluation: PolicyEvaluation;
  summary: {
    headline: string;
    explanation: string;
  };
  quote: BridgeQuote | null;
};
