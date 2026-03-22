export type PaymentRequestPayload = {
  rawRequest: string;
  requesterLabel?: string;
};

export function isPaymentRequestPayload(value: unknown): value is PaymentRequestPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      "rawRequest" in value &&
      typeof (value as { rawRequest: unknown }).rawRequest === "string",
  );
}
