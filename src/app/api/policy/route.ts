import { NextResponse } from "next/server";
import { getLatestTreasuryPolicy } from "@/lib/db/repositories/treasury-policy";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ policy: await getLatestTreasuryPolicy() });
}

export async function PUT(request: Request) {
  const body = await request.json();

  return NextResponse.json(
    {
      error: "Policy updates are not implemented yet.",
      received: body,
    },
    { status: 501 },
  );
}
