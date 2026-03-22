import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/wallet/client", () => ({
  loadStoredWallet: vi.fn(),
}));

import { loadStoredWallet } from "@/lib/wallet/client";
import {
  WalletTransferError,
  getWalletTransferErrorStatus,
  transferAsset,
} from "@/lib/wallet/transfer-asset";

const mockedLoadStoredWallet = vi.mocked(loadStoredWallet);

describe("transferAsset", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.WDK_EXECUTION_ENABLED = "false";
    process.env.WDK_ASSET_SYMBOL = "USDt";
    process.env.WDK_ASSET_DECIMALS = "6";
    process.env.WDK_PAYMASTER_TOKEN_ADDRESS = "0xd077a400968890eacc75cdc901f0356c943e4fdb";
  });

  it("blocks transfers when live execution is disabled", async () => {
    await expect(
      transferAsset({
        paymentRequestId: "req_disabled",
        recipientAddress: "0x11a00000000000000000000000000000000044ed",
        asset: "USDt",
        amount: 250,
      }),
    ).rejects.toMatchObject({
      name: "WalletTransferError",
      code: "execution_disabled",
    } satisfies Partial<WalletTransferError>);
  });

  it("submits a live transfer through the loaded WDK account when enabled", async () => {
    process.env.WDK_EXECUTION_ENABLED = "true";

    const transfer = vi.fn().mockResolvedValue({
      hash: "0xabc123",
      fee: BigInt(42),
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
        transfer,
      } as never,
    });

    const result = await transferAsset({
      paymentRequestId: "req_live",
      recipientAddress: "0x11a00000000000000000000000000000000044ed",
      asset: "USDt",
      amount: 250,
    });

    expect(result).toEqual({
      paymentRequestId: "req_live",
      txHash: "0xabc123",
      status: "submitted",
    });
    expect(transfer).toHaveBeenCalledWith({
      token: "0xd077a400968890eacc75cdc901f0356c943e4fdb",
      recipient: "0x11a00000000000000000000000000000000044ed",
      amount: BigInt(250000000),
    });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("maps transfer failures to HTTP statuses", () => {
    expect(
      getWalletTransferErrorStatus(
        new WalletTransferError("execution_disabled", "Execution is disabled."),
      ),
    ).toBe(503);
    expect(
      getWalletTransferErrorStatus(new WalletTransferError("unsupported_asset", "Unsupported asset.")),
    ).toBe(400);
    expect(
      getWalletTransferErrorStatus(new WalletTransferError("transfer_failed", "Submission failed.")),
    ).toBe(502);
  });
});
