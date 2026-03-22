import { listStoredAuditEvents } from "@/lib/db/repositories/payment-requests";

export async function listAuditEvents() {
  return listStoredAuditEvents();
}
