import { NextResponse } from "next/server";
import { listAuditEvents } from "@/lib/audit/service";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ auditEvents: await listAuditEvents() });
}
