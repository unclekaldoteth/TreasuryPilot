import { isFeatureEnabled } from "@/lib/config/features";
import { findAgentClientByTokenHash } from "@/lib/db/repositories/agent-clients";
import type { AgentPaymentRequestPayload } from "@/lib/schemas/agent";
import { createDeterministicHash } from "@/lib/utils/ids";

export type AgentGatewayAuthResult = {
  ok: boolean;
  status: number;
  reason?: string;
  agentClient?: {
    id: string;
    name: string;
    callbackUrl?: string | null;
    status: string;
    authTokenHash: string;
  };
};

export type NormalizedAgentRequest = {
  rawRequest: string;
  requesterLabel: string;
  requestSource: "agent";
  sourceAgentId: string;
  sourceAgentName: string;
  callbackUrl?: string;
  authTokenHash: string;
};

export function getAgentGatewayStatus() {
  const enabled = isFeatureEnabled("agentGateway");

  return {
    enabled,
    mode: "stub",
    message: enabled
      ? "Agent gateway scaffold is enabled. Authentication and persistence are still placeholder implementations."
      : "Agent gateway feature flag is disabled.",
  };
}

export async function authenticateAgentClient(authToken?: string): Promise<AgentGatewayAuthResult> {
  if (!isFeatureEnabled("agentGateway")) {
    return {
      ok: false,
      status: 503,
      reason: "Agent gateway feature flag is disabled.",
    };
  }

  if (!authToken) {
    return {
      ok: false,
      status: 401,
      reason: "Missing agent auth token.",
    };
  }

  const tokenHash = createDeterministicHash(authToken);
  const agentClient = await findAgentClientByTokenHash(tokenHash);

  if (!agentClient || agentClient.status !== "enabled") {
    return {
      ok: false,
      status: 403,
      reason: "Agent client is not registered or is disabled.",
    };
  }

  return {
    ok: true,
    status: 200,
    agentClient,
  };
}

export function normalizeAgentPaymentRequest(
  payload: AgentPaymentRequestPayload,
  authenticatedAgentClient: {
    id: string;
    name: string;
    callbackUrl?: string | null;
    authTokenHash: string;
  },
): NormalizedAgentRequest {
  return {
    rawRequest: payload.rawRequest,
    requesterLabel: payload.requesterLabel ?? payload.agentName ?? authenticatedAgentClient.name,
    requestSource: "agent",
    sourceAgentId: authenticatedAgentClient.id,
    sourceAgentName: payload.agentName ?? authenticatedAgentClient.name,
    callbackUrl: payload.callbackUrl ?? authenticatedAgentClient.callbackUrl ?? undefined,
    authTokenHash: authenticatedAgentClient.authTokenHash,
  };
}
