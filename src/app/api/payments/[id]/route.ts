import { NextResponse } from "next/server";
import { getStoredPaymentRequestById } from "@/lib/db/repositories/payment-requests";
import { refreshPendingTransactionStatuses } from "@/lib/wallet/refresh-transactions";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

export const runtime = "nodejs";

function shouldRefresh(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("refresh") === "true";
}

export async function GET(request: Request, context: RouteContext) {
  const { id } = await Promise.resolve(context.params);

  if (shouldRefresh(request)) {
    await refreshPendingTransactionStatuses({ paymentRequestId: id }).catch(() => null);
  }

  const payment = await getStoredPaymentRequestById(id);

  if (!payment) {
    return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
  }

  return NextResponse.json(payment);
}
