export type VendorPayload = {
  name: string;
  walletAddress: string;
};

export function isVendorPayload(value: unknown): value is VendorPayload {
  return Boolean(
    value &&
      typeof value === "object" &&
      "name" in value &&
      "walletAddress" in value,
  );
}
