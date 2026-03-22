import { AppShell } from "@/components/layout/app-shell";
import { PaymentConsole } from "@/components/payments/payment-console";

export default function PaymentsPage() {
  return (
    <AppShell
      title="Payment Console"
      description="Submit a treasury request, inspect the live decision trail, and watch pending executions refresh into confirmed or failed onchain outcomes."
    >
      <PaymentConsole />
    </AppShell>
  );
}
