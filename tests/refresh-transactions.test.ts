import { beforeEach, describe, expect, it, vi } from "vitest";
import { preparePaymentRequest } from "@/lib/agent/runtime";
import {
  createStoredPaymentRequest,
  getStoredPaymentRequestById,
} from "@/lib/db/repositories/payment-requests";
import { refreshPendingTransactionStatuses } from "@/lib/wallet/refresh-transactions";
import { resetTestDatabase, seedTreasuryFixtures } from "./helpers/database";

vi.mock("@/lib/wallet/client", () => ({
  loadStoredWallet: vi.fn(),
}));

import { loadStoredWallet } from "@/lib/wallet/client";

const mockedLoadStoredWallet = vi.mocked(loadStoredWallet);

describe("refreshPendingTransactionStatuses", () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetTestDatabase();
    await seedTreasuryFixtures();
  });

  it("confirms submitted transactions when the user operation receipt succeeds", async () => {
    const prepared = await preparePaymentRequest("Pay Northstar Design 250 USDT for February design work");

    await createStoredPaymentRequest({
      id: "req_refresh_confirmed",
      rawRequest: "Pay Northstar Design 250 USDT for February design work",
      requesterLabel: "Treasury admin",
      requestSource: "human",
      prepared,
      transaction: {
        paymentRequestId: "req_refresh_confirmed",
        txHash: "0xconfirmedhash",
        status: "submitted",
      },
      network: "ethereum-sepolia",
    });

    const dispose = vi.fn();
    mockedLoadStoredWallet.mockResolvedValue({
      walletConfig: {
        id: "wallet_01",
        network: "ethereum-sepolia",
        walletType: "erc-4337",
        publicAddress: "0x1234000000000000000000000000000000005678",
        encryptedSeed: "encrypted",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      seedPhrase: "test test test test test test test test test test test junk",
      walletManager: {
        dispose,
      } as never,
      account: {
        getUserOperationReceipt: vi.fn().mockResolvedValue({
          success: true,
          receipt: {
            blockNumber: "12345",
          },
        }),
        getTransactionReceipt: vi.fn().mockResolvedValue(null),
      } as never,
    });

    const refreshResults = await refreshPendingTransactionStatuses({
      paymentRequestId: "req_refresh_confirmed",
    });
    const stored = await getStoredPaymentRequestById("req_refresh_confirmed");

    expect(refreshResults).toEqual([
      {
        transactionId: expect.any(String),
        paymentRequestId: "req_refresh_confirmed",
        status: "confirmed",
      },
    ]);
    expect(stored?.paymentRequest.status).toBe("executed");
    expect(stored?.transactions[0]?.txStatus).toBe("confirmed");
    expect(stored?.auditEvents.some((event) => event.eventType === "execution_confirmed")).toBe(true);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("keeps submitted transactions pending when no receipt is available yet", async () => {
    const prepared = await preparePaymentRequest("Pay Northstar Design 250 USDT for February design work");

    await createStoredPaymentRequest({
      id: "req_refresh_pending",
      rawRequest: "Pay Northstar Design 250 USDT for February design work",
      requesterLabel: "Treasury admin",
      requestSource: "human",
      prepared,
      transaction: {
        paymentRequestId: "req_refresh_pending",
        txHash: "0xpendinghash",
        status: "submitted",
      },
      network: "ethereum-sepolia",
    });

    mockedLoadStoredWallet.mockResolvedValue({
      walletConfig: {
        id: "wallet_02",
        network: "ethereum-sepolia",
        walletType: "erc-4337",
        publicAddress: "0x1234000000000000000000000000000000005678",
        encryptedSeed: "encrypted",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      seedPhrase: "test test test test test test test test test test test junk",
      walletManager: {
        dispose: vi.fn(),
      } as never,
      account: {
        getUserOperationReceipt: vi.fn().mockResolvedValue(null),
        getTransactionReceipt: vi.fn().mockResolvedValue(null),
      } as never,
    });

    const refreshResults = await refreshPendingTransactionStatuses({
      paymentRequestId: "req_refresh_pending",
    });
    const stored = await getStoredPaymentRequestById("req_refresh_pending");

    expect(refreshResults).toEqual([
      {
        transactionId: expect.any(String),
        paymentRequestId: "req_refresh_pending",
        status: "submitted",
      },
    ]);
    expect(stored?.paymentRequest.status).toBe("executing");
    expect(stored?.transactions[0]?.txStatus).toBe("submitted");
  });
});
