import { beforeEach, describe, expect, it } from "vitest";
import { getLatestWalletConfig } from "@/lib/db/repositories/wallet-config";
import { POST as createWalletRoute } from "@/app/api/wallet/route";
import { createWallet } from "@/lib/wallet/create-wallet";
import { getWalletBalance } from "@/lib/wallet/get-balance";
import { resetTestDatabase } from "./helpers/database";
import { hasConfiguredTestDatabase } from "./helpers/test-database";

const DEMO_SEED_PHRASE = "test test test test test test test test test test test junk";
const describeDatabase = hasConfiguredTestDatabase ? describe : describe.skip;

describeDatabase("wallet integration", () => {
  beforeEach(async () => {
    process.env.APP_ENCRYPTION_KEY = "test-encryption-key";
    await resetTestDatabase();
  });

  it("creates and persists an ERC-4337 wallet from a valid seed phrase", async () => {
    const wallet = await createWallet({
      network: "ethereum-sepolia",
      seedPhrase: DEMO_SEED_PHRASE,
    });
    const stored = await getLatestWalletConfig();

    expect(wallet.status).toBe("connected");
    expect(wallet.walletType).toBe("erc-4337");
    expect(wallet.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(stored?.publicAddress).toBe(wallet.address);
    expect(stored?.encryptedSeed).not.toBe(DEMO_SEED_PHRASE);
  });

  it("returns a missing state when balance is requested before wallet setup", async () => {
    const balance = await getWalletBalance();

    expect(balance.status).toBe("missing");
    expect(balance.error).toMatch(/not been initialized/i);
  });

  it("refuses to overwrite an existing wallet through the API without force=true", async () => {
    await createWallet({
      network: "ethereum-sepolia",
      seedPhrase: DEMO_SEED_PHRASE,
    });

    const response = await createWalletRoute(
      new Request("http://localhost:3000/api/wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }),
    );

    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(409);
    expect(payload.error).toMatch(/already stored/i);
  });
});
