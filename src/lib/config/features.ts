import { getEnv } from "@/lib/config/env";

export type FeatureFlagName = "agentGateway" | "bridgeRouting";

export function getFeatureFlags() {
  const env = getEnv();

  return {
    agentGateway: env.featureAgentGateway,
    bridgeRouting: env.featureBridgeRouting,
  };
}

export function isFeatureEnabled(feature: FeatureFlagName) {
  return getFeatureFlags()[feature];
}
