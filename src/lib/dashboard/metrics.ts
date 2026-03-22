import type { PaymentRequestRecord } from "@/lib/types";

export type DashboardMetrics = {
  totalProcessed: number;
  executedCount: number;
  rejectedCount: number;
  escalatedCount: number;
  executionRate: number;
  totalMoved: number;
};

export function calculateDashboardMetrics(paymentRequests: PaymentRequestRecord[]): DashboardMetrics {
  const totalProcessed = paymentRequests.length;
  const executedCount = paymentRequests.filter((request) => request.status === "executed").length;
  const rejectedCount = paymentRequests.filter((request) => request.status === "rejected").length;
  const escalatedCount = paymentRequests.filter((request) => request.status === "escalated").length;
  const executionRate = totalProcessed > 0 ? Math.round((executedCount / totalProcessed) * 100) : 0;
  const totalMoved = paymentRequests
    .filter((request) => request.status === "executed")
    .reduce((sum, request) => {
      const num = Number.parseFloat(request.amount.replace(/[^0-9.]/g, ""));
      return sum + (Number.isNaN(num) ? 0 : num);
    }, 0);

  return {
    totalProcessed,
    executedCount,
    rejectedCount,
    escalatedCount,
    executionRate,
    totalMoved,
  };
}
