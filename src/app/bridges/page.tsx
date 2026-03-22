import { AppShell } from "@/components/layout/app-shell";
import { BridgeConsole } from "@/components/bridges/bridge-console";

export const dynamic = "force-dynamic";

export default function BridgesPage() {
  return (
    <AppShell
      title="Bridge Console"
      description="Submit cross-chain treasury routing requests in natural language, inspect the active bridge runtime, and review recent bridge activity. Payments run on Sepolia testnet in this demo, while bridge routes remain demo-safe unless an Arbitrum bridge runtime is configured."
    >
      <BridgeConsole />
    </AppShell>
  );
}
