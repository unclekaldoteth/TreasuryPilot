export type AgentPaymentRequestPayload = {
  rawRequest: string;
  authToken?: string;
  agentId?: string;
  agentName?: string;
  callbackUrl?: string;
  requesterLabel?: string;
};

export function isAgentPaymentRequestPayload(value: unknown): value is AgentPaymentRequestPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      "rawRequest" in value &&
      typeof (value as { rawRequest: unknown }).rawRequest === "string",
  );
}
