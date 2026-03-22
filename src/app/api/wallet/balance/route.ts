import { NextResponse } from "next/server";
import { getWalletBalance } from "@/lib/wallet/get-balance";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getWalletBalance());
}
