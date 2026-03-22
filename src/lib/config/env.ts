import { resolveDatabaseUrl } from "@/lib/db/resolve-database-url";

const requiredKeys = ["DATABASE_URL", "APP_ENCRYPTION_KEY"] as const;

function parseBooleanFlag(value: string | undefined) {
  return value === "true";
}

function parseInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBigIntValue(value: string | undefined, fallback: bigint) {
  if (!value) {
    return fallback;
  }

  try {
    return BigInt(value);
  } catch {
    return fallback;
  }
}

function parseCsv(value: string | undefined, fallback: string[]) {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  return entries.length > 0 ? entries : fallback;
}

export function getEnv() {
  return {
    databaseUrl: resolveDatabaseUrl(process.env.DATABASE_URL ?? "file:./prisma/dev.db"),
    appEncryptionKey: process.env.APP_ENCRYPTION_KEY ?? "replace-with-32-byte-key",
    openAiApiKey: process.env.OPENAI_API_KEY ?? "",
    wdkNetwork: process.env.WDK_NETWORK ?? "ethereum-sepolia",
    wdkChainId: parseInteger(process.env.WDK_CHAIN_ID, 11155111),
    wdkRpcUrl: process.env.WDK_RPC_URL ?? "https://sepolia.drpc.org",
    wdkBundlerUrl: process.env.WDK_BUNDLER_URL ?? "https://api.candide.dev/public/v3/11155111",
    wdkPaymasterUrl: process.env.WDK_PAYMASTER_URL ?? "https://api.candide.dev/public/v3/11155111",
    wdkPaymasterAddress:
      process.env.WDK_PAYMASTER_ADDRESS ?? "0x8b1f6cb5d062aa2ce8d581942bbb960420d875ba",
    wdkEntryPointAddress:
      process.env.WDK_ENTRY_POINT_ADDRESS ?? "0x0000000071727De22E5E9d8BAf0edAc6f37da032",
    wdkSafeModulesVersion: process.env.WDK_SAFE_MODULES_VERSION ?? "0.3.0",
    wdkPaymasterTokenAddress:
      process.env.WDK_PAYMASTER_TOKEN_ADDRESS ?? "0xd077a400968890eacc75cdc901f0356c943e4fdb",
    wdkTransferMaxFee: parseInteger(process.env.WDK_TRANSFER_MAX_FEE, 100000),
    wdkAssetSymbol: process.env.WDK_ASSET_SYMBOL ?? "USDt",
    wdkAssetDecimals: parseInteger(process.env.WDK_ASSET_DECIMALS, 6),
    wdkExecutionEnabled: parseBooleanFlag(process.env.WDK_EXECUTION_ENABLED),
    wdkBridgeSourceNetwork: process.env.WDK_BRIDGE_SOURCE_NETWORK ?? "arbitrum",
    wdkBridgeAllowedDestinations: parseCsv(process.env.WDK_BRIDGE_ALLOWED_DESTINATIONS, [
      "optimism",
      "polygon",
      "ethereum",
      "solana",
    ]),
    wdkBridgeTokenAddress: process.env.WDK_BRIDGE_TOKEN_ADDRESS ?? "",
    wdkBridgeSpenderAddress: process.env.WDK_BRIDGE_SPENDER_ADDRESS ?? "",
    wdkBridgeAssetSymbol: process.env.WDK_BRIDGE_ASSET_SYMBOL ?? "USDt0",
    wdkBridgeAssetDecimals: parseInteger(process.env.WDK_BRIDGE_ASSET_DECIMALS, 6),
    wdkBridgeMaxFee: parseBigIntValue(process.env.WDK_BRIDGE_MAX_FEE, 1000000000000000n),
    wdkBridgeExecutionEnabled: parseBooleanFlag(process.env.WDK_BRIDGE_EXECUTION_ENABLED),
    featureAgentGateway: parseBooleanFlag(process.env.FEATURE_AGENT_GATEWAY),
    featureBridgeRouting: parseBooleanFlag(process.env.FEATURE_BRIDGE_ROUTING),
  };
}

export function getMissingEnvKeys() {
  return requiredKeys.filter((key) => !process.env[key]);
}
