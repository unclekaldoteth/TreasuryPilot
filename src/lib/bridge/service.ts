import type {
  BridgeQuote,
  PolicyEvaluation,
  PolicyRuleResult,
  TransactionRecord,
  TreasuryPolicy,
} from "@/lib/types";
import { getEnv } from "@/lib/config/env";
import { getLatestTreasuryPolicy } from "@/lib/db/repositories/treasury-policy";
import { parseBridgeRequest } from "@/lib/bridge/parse-bridge-request";
import type {
  BridgeFeatureStatus,
  BridgePreparedRequest,
  BridgeRequestInput,
  VerifiedBridgeRoute,
} from "@/lib/bridge/types";
import { createId } from "@/lib/utils/ids";
import { toBaseUnitAmount } from "@/lib/utils/money";
import { loadStoredWallet } from "@/lib/wallet/client";

type BridgeExecutionErrorCode =
  | "feature_disabled"
  | "execution_disabled"
  | "wallet_missing"
  | "unsupported_source_network"
  | "unsupported_route"
  | "unsupported_asset"
  | "approval_missing"
  | "approval_failed"
  | "quote_failed"
  | "bridge_failed";

type BridgeExecutionResult = {
  transaction: TransactionRecord;
  quote: BridgeQuote | null;
  approvalHash?: string;
};

const ERC4337_SUPPORTED_SOURCE_NETWORKS = new Set(["arbitrum"]);

function isEvmAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export class BridgeExecutionError extends Error {
  code: BridgeExecutionErrorCode;

  constructor(code: BridgeExecutionErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "BridgeExecutionError";
  }
}

function buildBridgeRuleResults(input: {
  feature: BridgeFeatureStatus;
  sourceNetwork: string;
  destinationNetwork: string;
  asset: string;
  amount: number;
  recipientAddress: string;
  ambiguous: boolean;
  policy: TreasuryPolicy;
}): PolicyRuleResult[] {
  const env = getEnv();
  const routeVerified = input.feature.verifiedRoutes.some(
    (route) =>
      route.sourceNetwork === input.sourceNetwork &&
      route.destinationNetwork === input.destinationNetwork &&
      route.asset === input.asset,
  );

  return [
    {
      rule: "bridge_feature_enabled",
      passed: input.feature.enabled,
      detail: input.feature.enabled
        ? "Bridge routing feature is enabled."
        : "Bridge routing is disabled by feature flag.",
    },
    {
      rule: "bridge_source_network",
      passed: input.sourceNetwork === input.feature.sourceNetwork,
      detail:
        input.sourceNetwork === input.feature.sourceNetwork
          ? `Bridge source ${input.sourceNetwork} matches the configured wallet runtime.`
          : `Bridge source ${input.sourceNetwork} does not match the configured source ${input.feature.sourceNetwork}.`,
    },
    {
      rule: "bridge_route_verified",
      passed: routeVerified,
      detail: routeVerified
        ? `Route ${input.sourceNetwork} -> ${input.destinationNetwork} is configured for live bridge requests.`
        : `Route ${input.sourceNetwork} -> ${input.destinationNetwork} is not configured for live bridge execution.`,
    },
    {
      rule: "bridge_asset_supported",
      passed: input.asset === env.wdkBridgeAssetSymbol,
      detail:
        input.asset === env.wdkBridgeAssetSymbol
          ? `Bridge asset ${input.asset} matches the configured treasury bridge asset.`
          : `Bridge asset ${input.asset} is not configured for live bridge execution.`,
    },
    {
      rule: "bridge_amount_positive",
      passed: input.amount > 0,
      detail: input.amount > 0 ? "Bridge amount is positive." : "Bridge amount must be greater than zero.",
    },
    {
      rule: "bridge_recipient_present",
      passed: input.recipientAddress.length > 0,
      detail:
        input.recipientAddress.length > 0
          ? "Recipient address is available for the destination chain."
          : "Recipient address is missing and the bridge cannot be prepared safely.",
    },
    {
      rule: "per_tx_limit",
      passed: input.amount <= input.policy.perTxLimit,
      detail:
        input.amount <= input.policy.perTxLimit
          ? `Bridge amount is within the per-transaction limit of ${input.policy.perTxLimit}.`
          : `Bridge amount exceeds the per-transaction limit of ${input.policy.perTxLimit}.`,
    },
    {
      rule: "auto_approval_threshold",
      passed: input.amount <= input.policy.autoApprovalLimit,
      detail:
        input.amount <= input.policy.autoApprovalLimit
          ? "Bridge amount is within the auto-approval threshold."
          : "Bridge amount exceeds the auto-approval threshold and requires review.",
    },
    {
      rule: "bridge_request_clarity",
      passed: !input.ambiguous,
      detail: input.ambiguous
        ? "The bridge request is ambiguous and should be reviewed by a human."
        : "The bridge request is specific enough for automated handling.",
    },
  ];
}

function evaluateBridgePolicy(input: {
  feature: BridgeFeatureStatus;
  sourceNetwork: string;
  destinationNetwork: string;
  asset: string;
  amount: number;
  recipientAddress: string;
  ambiguous: boolean;
  policy: TreasuryPolicy;
}): PolicyEvaluation {
  const results = buildBridgeRuleResults(input);
  const failedRules = results.filter(
    (rule) =>
      !rule.passed &&
      ![
        "auto_approval_threshold",
        "bridge_request_clarity",
        "bridge_source_network",
        "bridge_route_verified",
      ].includes(rule.rule),
  );
  const needsAmountApproval = results.some(
    (rule) => rule.rule === "auto_approval_threshold" && !rule.passed,
  );
  const needsExecutionReview = results.some(
    (rule) =>
      !rule.passed &&
      ["bridge_source_network", "bridge_route_verified"].includes(rule.rule),
  );

  if (failedRules.length > 0) {
    return {
      decision: "reject",
      reason: failedRules[0]?.detail ?? "Bridge request failed one or more policy checks.",
      results,
    };
  }

  if (input.ambiguous || needsAmountApproval || needsExecutionReview || !input.feature.executionEnabled) {
    return {
      decision: "escalate",
      reason: input.ambiguous
        ? "Bridge request is ambiguous and requires a human review."
        : needsAmountApproval
          ? "Bridge request is valid but exceeds the auto-approval threshold."
          : "Bridge request was parsed successfully, but live bridge execution is unavailable in the current demo/runtime configuration.",
      results,
    };
  }

  return {
    decision: "execute",
    reason: "Bridge request satisfies the configured policy and can be executed automatically.",
    results,
  };
}

function createHeadline(destinationNetwork: string) {
  return `Bridge treasury liquidity to ${destinationNetwork}`;
}

function createExplanation(input: {
  amount: number;
  asset: string;
  sourceNetwork: string;
  destinationNetwork: string;
  purpose: string;
  decision: PolicyEvaluation["decision"];
}) {
  const amountText = `${input.amount} ${input.asset}`;
  const action =
    input.decision === "execute"
      ? "execute automatically"
      : input.decision === "escalate"
        ? "escalate for review"
        : "reject";

  return `TreasuryPilot will ${action} the bridge of ${amountText} from ${input.sourceNetwork} to ${input.destinationNetwork} for ${input.purpose}.`;
}

function buildVerifiedBridgeRoutes(): VerifiedBridgeRoute[] {
  const env = getEnv();

  if (!env.featureBridgeRouting || !isEvmAddress(env.wdkBridgeTokenAddress)) {
    return [];
  }

  if (!ERC4337_SUPPORTED_SOURCE_NETWORKS.has(env.wdkBridgeSourceNetwork)) {
    return [];
  }

  return buildSupportedBridgeRoutes()
    .filter((route) => route.sourceNetwork === env.wdkBridgeSourceNetwork)
    .map((route) => ({
      ...route,
      id: `${route.sourceNetwork}-${route.destinationNetwork}-${route.asset.toLowerCase()}`,
    }));
}

function buildSupportedBridgeRoutes(): VerifiedBridgeRoute[] {
  const env = getEnv();

  if (!env.featureBridgeRouting) {
    return [];
  }

  return env.wdkBridgeAllowedDestinations
    .filter((destination) => destination !== env.wdkBridgeSourceNetwork)
    .map((destination) => ({
      id: `${env.wdkBridgeSourceNetwork}-${destination}-${env.wdkBridgeAssetSymbol.toLowerCase()}`,
      sourceNetwork: env.wdkBridgeSourceNetwork,
      destinationNetwork: destination,
      asset: env.wdkBridgeAssetSymbol,
    }));
}

async function loadBridgeProtocol() {
  const [{ default: Usdt0ProtocolEvm }] = await Promise.all([
    import("@tetherto/wdk-protocol-bridge-usdt0-evm"),
  ]);

  return { Usdt0ProtocolEvm };
}

async function ensureBridgeAllowance(amount: bigint) {
  const env = getEnv();
  const wallet = await loadStoredWallet();

  if (!wallet) {
    throw new BridgeExecutionError(
      "wallet_missing",
      "No persisted treasury wallet is available for live bridge execution.",
    );
  }

  try {
    if (!env.wdkBridgeSpenderAddress) {
      throw new BridgeExecutionError(
        "approval_missing",
        "WDK_BRIDGE_SPENDER_ADDRESS is required to manage bridge allowance for the ERC-4337 wallet.",
      );
    }

    const currentAllowance = await wallet.account.getAllowance(
      env.wdkBridgeTokenAddress,
      env.wdkBridgeSpenderAddress,
    );

    if (currentAllowance >= amount) {
      return undefined;
    }

    const approvalResult = await wallet.account.approve({
      token: env.wdkBridgeTokenAddress,
      spender: env.wdkBridgeSpenderAddress,
      amount,
    });

    return approvalResult.hash;
  } catch (error) {
    if (error instanceof BridgeExecutionError) {
      throw error;
    }

    throw new BridgeExecutionError(
      "approval_failed",
      error instanceof Error ? error.message : "Bridge allowance approval failed.",
    );
  } finally {
    wallet.walletManager.dispose();
  }
}

export function getBridgeExecutionErrorStatus(error: unknown) {
  if (!(error instanceof BridgeExecutionError)) {
    return 500;
  }

  switch (error.code) {
    case "feature_disabled":
    case "execution_disabled":
    case "wallet_missing":
      return 503;
    case "unsupported_source_network":
    case "unsupported_route":
    case "unsupported_asset":
    case "approval_missing":
      return 400;
    case "approval_failed":
    case "quote_failed":
    case "bridge_failed":
      return 502;
    default:
      return 500;
  }
}

export function createFailedBridgeTransactionRecord(paymentRequestId: string, error: unknown): TransactionRecord {
  const message = error instanceof Error ? error.message : "Unexpected bridge execution error.";

  return {
    paymentRequestId,
    status: "failed",
    error: message,
  };
}

export function getBridgeFeatureStatus(): BridgeFeatureStatus {
  const env = getEnv();
  const supportedRoutes = buildSupportedBridgeRoutes();
  const verifiedRoutes = buildVerifiedBridgeRoutes();
  const bridgeCapable =
    env.featureBridgeRouting &&
    isEvmAddress(env.wdkBridgeTokenAddress) &&
    ERC4337_SUPPORTED_SOURCE_NETWORKS.has(env.wdkBridgeSourceNetwork);

  return {
    enabled: env.featureBridgeRouting,
    executionEnabled: env.wdkBridgeExecutionEnabled,
    mode: bridgeCapable ? "live" : "stub",
    sourceNetwork: env.wdkBridgeSourceNetwork,
    asset: env.wdkBridgeAssetSymbol,
    supportedRoutes,
    verifiedRoutes,
    message: !env.featureBridgeRouting
      ? "Bridge routing feature flag is disabled."
      : !isEvmAddress(env.wdkBridgeTokenAddress)
        ? "Bridge routing is enabled, but WDK_BRIDGE_TOKEN_ADDRESS is not configured yet."
        : !ERC4337_SUPPORTED_SOURCE_NETWORKS.has(env.wdkBridgeSourceNetwork)
          ? `Current bridge runtime ${env.wdkBridgeSourceNetwork} is not supported for ERC-4337 bridge execution in this app.`
          : env.wdkBridgeExecutionEnabled
            ? "Bridge routing is configured for live execution on the verified route set."
            : "Bridge routing can parse and prepare live routes, but execution is disabled until WDK_BRIDGE_EXECUTION_ENABLED=true.",
  };
}

export async function quoteBridgeIntent(intent: {
  sourceNetwork: string;
  destinationNetwork: string;
  recipientAddress: string;
  asset: string;
  amount: number;
}) {
  const env = getEnv();
  const feature = getBridgeFeatureStatus();

  if (!feature.enabled) {
    throw new BridgeExecutionError(
      "feature_disabled",
      "Bridge routing is disabled by feature flag.",
    );
  }

  if (feature.mode !== "live") {
    throw new BridgeExecutionError(
      "unsupported_source_network",
      feature.message,
    );
  }

  if (intent.sourceNetwork !== env.wdkBridgeSourceNetwork) {
    throw new BridgeExecutionError(
      "unsupported_source_network",
      `Bridge source ${intent.sourceNetwork} does not match the configured runtime ${env.wdkBridgeSourceNetwork}.`,
    );
  }

  const routeVerified = feature.verifiedRoutes.some(
    (route) =>
      route.sourceNetwork === intent.sourceNetwork &&
      route.destinationNetwork === intent.destinationNetwork &&
      route.asset === intent.asset,
  );

  if (!routeVerified) {
    throw new BridgeExecutionError(
      "unsupported_route",
      `Bridge route ${intent.sourceNetwork} -> ${intent.destinationNetwork} is not configured for live execution.`,
    );
  }

  if (intent.asset !== env.wdkBridgeAssetSymbol) {
    throw new BridgeExecutionError(
      "unsupported_asset",
      `Bridge asset ${intent.asset} is not configured for live execution.`,
    );
  }

  const wallet = await loadStoredWallet();

  if (!wallet) {
    throw new BridgeExecutionError(
      "wallet_missing",
      "No persisted treasury wallet is available for live bridge execution.",
    );
  }

  try {
    const { Usdt0ProtocolEvm } = await loadBridgeProtocol();
    const bridgeProtocol = new Usdt0ProtocolEvm(wallet.account, {
      bridgeMaxFee: env.wdkBridgeMaxFee,
    });
    const amount = toBaseUnitAmount(intent.amount, env.wdkBridgeAssetDecimals);
    const quote = await bridgeProtocol.quoteBridge(
      {
        targetChain: intent.destinationNetwork,
        recipient: intent.recipientAddress,
        token: env.wdkBridgeTokenAddress,
        amount,
      },
      {
        paymasterToken: { address: env.wdkPaymasterTokenAddress },
      },
    );

    return {
      feeWei: quote.fee.toString(),
      bridgeFeeWei: quote.bridgeFee.toString(),
      totalFeeWei: (quote.fee + quote.bridgeFee).toString(),
    } satisfies BridgeQuote;
  } catch (error) {
    throw new BridgeExecutionError(
      "quote_failed",
      error instanceof Error ? error.message : "WDK bridge quote failed.",
    );
  } finally {
    wallet.walletManager.dispose();
  }
}

export async function prepareBridgeRequest(input: BridgeRequestInput): Promise<BridgePreparedRequest> {
  const wallet = await loadStoredWallet();
  const defaultRecipientAddress = wallet ? await wallet.account.getAddress() : "";
  const intent = parseBridgeRequest(input.rawRequest, defaultRecipientAddress);

  if (wallet) {
    wallet.walletManager.dispose();
  }

  const [policy, feature] = await Promise.all([getLatestTreasuryPolicy(), Promise.resolve(getBridgeFeatureStatus())]);
  const evaluation = evaluateBridgePolicy({
    feature,
    sourceNetwork: intent.sourceNetwork,
    destinationNetwork: intent.destinationNetwork,
    asset: intent.asset,
    amount: intent.amount,
    recipientAddress: intent.recipientAddress,
    ambiguous: intent.ambiguous,
    policy,
  });

  let quote: BridgeQuote | null = null;

  if (feature.enabled && feature.mode === "live" && evaluation.decision !== "reject") {
    try {
      quote = await quoteBridgeIntent(intent);
    } catch {
      quote = null;
    }
  }

  return {
    intent,
    evaluation,
    quote,
    summary: {
      headline: createHeadline(intent.destinationNetwork),
      explanation: createExplanation({
        amount: intent.amount,
        asset: intent.asset,
        sourceNetwork: intent.sourceNetwork,
        destinationNetwork: intent.destinationNetwork,
        purpose: intent.purpose,
        decision: evaluation.decision,
      }),
    },
  };
}

export async function executeBridgeIntent(input: {
  paymentRequestId: string;
  sourceNetwork: string;
  destinationNetwork: string;
  recipientAddress: string;
  asset: string;
  amount: number;
}): Promise<BridgeExecutionResult> {
  const env = getEnv();
  const feature = getBridgeFeatureStatus();

  if (!feature.enabled) {
    throw new BridgeExecutionError(
      "feature_disabled",
      "Bridge routing is disabled by feature flag.",
    );
  }

  if (!env.wdkBridgeExecutionEnabled) {
    throw new BridgeExecutionError(
      "execution_disabled",
      "Live bridge execution is disabled. Set WDK_BRIDGE_EXECUTION_ENABLED=true to submit real bridge transactions.",
    );
  }

  const quote = await quoteBridgeIntent({
    sourceNetwork: input.sourceNetwork,
    destinationNetwork: input.destinationNetwork,
    recipientAddress: input.recipientAddress,
    asset: input.asset,
    amount: input.amount,
  });
  const amount = toBaseUnitAmount(input.amount, env.wdkBridgeAssetDecimals);
  const approvalHash = await ensureBridgeAllowance(amount);
  const wallet = await loadStoredWallet();

  if (!wallet) {
    throw new BridgeExecutionError(
      "wallet_missing",
      "No persisted treasury wallet is available for live bridge execution.",
    );
  }

  try {
    const { Usdt0ProtocolEvm } = await loadBridgeProtocol();
    const bridgeProtocol = new Usdt0ProtocolEvm(wallet.account, {
      bridgeMaxFee: env.wdkBridgeMaxFee,
    });
    const result = await bridgeProtocol.bridge(
      {
        targetChain: input.destinationNetwork,
        recipient: input.recipientAddress,
        token: env.wdkBridgeTokenAddress,
        amount,
      },
      {
        paymasterToken: { address: env.wdkPaymasterTokenAddress },
        bridgeMaxFee: env.wdkBridgeMaxFee,
      },
    );

    return {
      quote,
      approvalHash,
      transaction: {
        paymentRequestId: input.paymentRequestId,
        txHash: result.hash,
        status: "submitted",
      },
    };
  } catch (error) {
    throw new BridgeExecutionError(
      "bridge_failed",
      error instanceof Error ? error.message : "WDK bridge submission failed.",
    );
  } finally {
    wallet.walletManager.dispose();
  }
}

export function createBridgeRequestId() {
  return {
    paymentRequestId: createId("req"),
    bridgeRequestId: createId("bridge"),
  };
}
