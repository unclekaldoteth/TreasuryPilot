export type BridgeRequestPayload = {
  rawRequest: string;
  requesterLabel?: string;
};

export function isBridgeRequestPayload(value: unknown): value is BridgeRequestPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      "rawRequest" in value &&
      typeof (value as { rawRequest: unknown }).rawRequest === "string",
  );
}
