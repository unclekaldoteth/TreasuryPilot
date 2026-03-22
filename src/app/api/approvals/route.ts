import { NextResponse } from "next/server";
import { listApprovals } from "@/lib/approvals/service";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ approvals: await listApprovals() });
}
