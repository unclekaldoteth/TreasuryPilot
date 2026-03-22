import { db } from "@/lib/db/client";
import type { Vendor } from "@/lib/types";

export async function listStoredVendors(): Promise<Vendor[]> {
  const vendors = await db.vendor.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });

  return vendors.map((vendor) => ({
    id: vendor.id,
    name: vendor.name,
    walletAddress: vendor.walletAddress,
    asset: vendor.asset,
    category: vendor.category,
    isAllowlisted: vendor.isAllowlisted,
    isBlocked: vendor.isBlocked,
  }));
}
