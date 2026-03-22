import { beforeEach, describe, expect, it, vi } from "vitest";

const protocolSpies = vi.hoisted(() => ({
  quoteBridge: vi.fn(),
  bridge: vi.fn(),
}));

vi.mock("@/lib/wallet/client", () => ({
  loadStoredWallet: vi.fn(),
}));

vi.mock("@/lib/db/repositories/treasury-policy", () => ({
  getLatestTreasuryPolicy: vi.fn(),
}));

vi.mock("@tetherto/wdk-protocol-bridge-usdt0-evm", () => ({
  default: vi.fn(
    class MockUsdt0ProtocolEvm {
      quoteBridge = protocolSpies.quoteBridge;
      bridge = protocolSpies.bridge;
    },
  ),
}));

import { loadStoredWallet } from "@/lib/wallet/client";
import { getLatestTreasuryPolicy } from "@/lib/db/repositories/treasury-policy";
import {
  executeBridgeIntent,
  getBridgeFeatureStatus,
  prepareBridgeRequest,
} from "@/lib/bridge/service";

const mockedLoadStoredWallet = vi.mocked(loadStoredWallet);
const mockedGetLatestTreasuryPolicy = vi.mocked(getLatestTreasuryPolicy);

function createWalletFixture() {
  const dispose = vi.fn();
  const getAddress = vi.fn().mockResolvedValue("0x1234000000000000000000000000000000005678");
  const getAllowance = vi.fn().mockResolvedValue(0n);
  const approve = vi.fn().mockResolvedValue({
    hash: "0xapprove123",
  });

  return {
    walletConfig: {
      id: "wallet_01",
      network: "arbitrum",
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
      getAddress,
      getAllowance,
      approve,
    } as never,
    spies: {
      dispose,
      getAddress,
      getAllowance,
      approve,
    },
  };
}

describe("bridge service", () => {
  beforeEach(() => {
    vi.resetAllMocks();

    process.env.FEATURE_BRIDGE_ROUTING = "true";
    process.env.WDK_BRIDGE_EXECUTION_ENABLED = "true";
    process.env.WDK_BRIDGE_SOURCE_NETWORK = "arbitrum";
    process.env.WDK_BRIDGE_ALLOWED_DESTINATIONS = "optimism,polygon,solana";
    process.env.WDK_BRIDGE_TOKEN_ADDRESS = "0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92";
    process.env.WDK_BRIDGE_SPENDER_ADDRESS = "0xa90f03c856D01F698E7071B393387cd75a8a319A";
    process.env.WDK_BRIDGE_ASSET_SYMBOL = "USDt0";
    process.env.WDK_BRIDGE_ASSET_DECIMALS = "6";
    process.env.WDK_BRIDGE_MAX_FEE = "1000000000000000";
    process.env.WDK_PAYMASTER_TOKEN_ADDRESS = "0xd077a400968890eacc75cdc901f0356c943e4fdb";

    mockedGetLatestTreasuryPolicy.mockResolvedValue({
      perTxLimit: 2500,
      dailyLimit: 5000,
      weeklyLimit: 15000,
      autoApprovalLimit: 500,
      allowedAssets: ["USDt"],
      allowedCategories: ["contractor", "software", "operations", "revenue-share"],
      requireAllowlist: true,
      paused: false,
    });

    protocolSpies.quoteBridge.mockResolvedValue({
      fee: 1n,
      bridgeFee: 2n,
    });
    protocolSpies.bridge.mockResolvedValue({
      hash: "0xbridge123",
      fee: 1n,
      bridgeFee: 2n,
    });
  });

  it("parses and evaluates a natural-language bridge request", async () => {
    mockedLoadStoredWallet.mockResolvedValue(createWalletFixture() as never);

    const prepared = await prepareBridgeRequest({
      paymentRequestId: "req_bridge_01",
      rawRequest: "Bridge 250 USDt0 from Arbitrum to Optimism for payroll liquidity",
    });

    expect(prepared.intent).toMatchObject({
      sourceNetwork: "arbitrum",
      destinationNetwork: "optimism",
      recipientAddress: "0x1234000000000000000000000000000000005678",
      asset: "USDt0",
      amount: 250,
      purpose: "payroll liquidity",
      ambiguous: false,
    });
    expect(prepared.evaluation.decision).toBe("execute");
    expect(prepared.quote).toEqual({
      feeWei: "1",
      bridgeFeeWei: "2",
      totalFeeWei: "3",
    });
  });

  it("submits a quoted bridge with allowance approval through WDK", async () => {
    const wallets = [createWalletFixture(), createWalletFixture(), createWalletFixture()];

    mockedLoadStoredWallet
      .mockResolvedValueOnce(wallets[0] as never)
      .mockResolvedValueOnce(wallets[1] as never)
      .mockResolvedValueOnce(wallets[2] as never);

    const result = await executeBridgeIntent({
      paymentRequestId: "req_bridge_execute",
      sourceNetwork: "arbitrum",
      destinationNetwork: "optimism",
      recipientAddress: "0x1234000000000000000000000000000000005678",
      asset: "USDt0",
      amount: 250,
    });

    expect(wallets[1].spies.getAllowance).toHaveBeenCalledWith(
      "0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92",
      "0xa90f03c856D01F698E7071B393387cd75a8a319A",
    );
    expect(wallets[1].spies.approve).toHaveBeenCalledWith({
      token: "0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92",
      spender: "0xa90f03c856D01F698E7071B393387cd75a8a319A",
      amount: 250000000n,
    });
    expect(protocolSpies.bridge).toHaveBeenCalledWith(
      {
        targetChain: "optimism",
        recipient: "0x1234000000000000000000000000000000005678",
        token: "0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92",
        amount: 250000000n,
      },
      {
        paymasterToken: { address: "0xd077a400968890eacc75cdc901f0356c943e4fdb" },
        bridgeMaxFee: 1000000000000000n,
      },
    );
    expect(result.approvalHash).toBe("0xapprove123");
    expect(result.transaction).toEqual({
      paymentRequestId: "req_bridge_execute",
      txHash: "0xbridge123",
      status: "submitted",
    });
    expect(result.quote).toEqual({
      feeWei: "1",
      bridgeFeeWei: "2",
      totalFeeWei: "3",
    });
  });

  it("reports stub mode when the bridge token address is not configured", () => {
    process.env.WDK_BRIDGE_TOKEN_ADDRESS = "set-your-usdt0-source-token-address";

    const feature = getBridgeFeatureStatus();

    expect(feature.mode).toBe("stub");
    expect(feature.verifiedRoutes).toHaveLength(0);
  });

  it("escalates a bridge request in demo-safe mode when live routing is unavailable", async () => {
    process.env.WDK_BRIDGE_TOKEN_ADDRESS = "set-your-usdt0-source-token-address";
    process.env.WDK_BRIDGE_EXECUTION_ENABLED = "false";

    mockedLoadStoredWallet.mockResolvedValue(createWalletFixture() as never);

    const prepared = await prepareBridgeRequest({
      paymentRequestId: "req_bridge_demo_safe",
      rawRequest: "Bridge 250 USDt0 from Arbitrum to Optimism for payroll liquidity",
    });

    expect(prepared.evaluation.decision).toBe("escalate");
    expect(prepared.evaluation.reason).toContain("live bridge execution is unavailable");
  });

  it("accepts a Solana destination when the request includes a Solana recipient", async () => {
    mockedLoadStoredWallet.mockResolvedValue(createWalletFixture() as never);

    const prepared = await prepareBridgeRequest({
      paymentRequestId: "req_bridge_solana",
      rawRequest:
        "Bridge 250 USDt0 from Arbitrum to Solana recipient HyXJcgYpURfDhgzuyRL7zxP4FhLg7LZQMeDrR4MXZcMN for settlement liquidity",
    });

    expect(prepared.intent).toMatchObject({
      destinationNetwork: "solana",
      recipientAddress: "HyXJcgYpURfDhgzuyRL7zxP4FhLg7LZQMeDrR4MXZcMN",
      purpose: "settlement liquidity",
      ambiguous: false,
    });
    expect(prepared.evaluation.decision).toBe("execute");
  });
});
