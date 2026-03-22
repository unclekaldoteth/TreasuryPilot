export type PolicyPayload = {
  autoApprovalLimit: number;
  perTxLimit: number;
};

export function isPolicyPayload(value: unknown): value is PolicyPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      "autoApprovalLimit" in value &&
      "perTxLimit" in value,
  );
}
