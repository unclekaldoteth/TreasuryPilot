import { NextResponse } from "next/server";
import { listStoredVendors } from "@/lib/db/repositories/vendors";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ vendors: await listStoredVendors() });
}

export async function POST(request: Request) {
  const body = await request.json();

  return NextResponse.json(
    {
      error: "Vendor creation is not implemented yet.",
      received: body,
    },
    { status: 501 },
  );
}
