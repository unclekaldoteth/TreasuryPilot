import type { EvmErc4337WalletConfig } from "@tetherto/wdk-wallet-evm-erc-4337";
import { getEnv } from "@/lib/config/env";
import { getLatestWalletConfig } from "@/lib/db/repositories/wallet-config";
import { decryptString } from "@/lib/utils/encryption";

async function loadWalletModules() {
  const [{ default: WalletManagerBase }, { default: WalletManagerEvmErc4337 }] = await Promise.all([
    import("@tetherto/wdk-wallet"),
    import("@tetherto/wdk-wallet-evm-erc-4337"),
  ]);

  return {
    WalletManagerBase,
    WalletManagerEvmErc4337,
  };
}

export function buildWalletManagerConfig(): EvmErc4337WalletConfig {
  const env = getEnv();

  return {
    chainId: env.wdkChainId,
    provider: env.wdkRpcUrl,
    bundlerUrl: env.wdkBundlerUrl,
    paymasterUrl: env.wdkPaymasterUrl,
    paymasterAddress: env.wdkPaymasterAddress,
    entryPointAddress: env.wdkEntryPointAddress,
    safeModulesVersion: env.wdkSafeModulesVersion,
    paymasterToken: {
      address: env.wdkPaymasterTokenAddress,
    },
    transferMaxFee: env.wdkTransferMaxFee,
  };
}

export function getWalletClientConfig() {
  const env = getEnv();

  return {
    network: env.wdkNetwork,
    chainId: env.wdkChainId,
    rpcUrl: env.wdkRpcUrl,
    bundlerUrl: env.wdkBundlerUrl,
    paymasterUrl: env.wdkPaymasterUrl,
    paymasterAddress: env.wdkPaymasterAddress,
    entryPointAddress: env.wdkEntryPointAddress,
    paymasterTokenAddress: env.wdkPaymasterTokenAddress,
    asset: env.wdkAssetSymbol,
    walletType: "erc-4337",
    executionEnabled: env.wdkExecutionEnabled,
    mode: "live-wdk",
  };
}

export async function createRandomSeedPhrase() {
  const { WalletManagerBase } = await loadWalletModules();
  return WalletManagerBase.getRandomSeedPhrase();
}

export async function isValidSeedPhrase(seedPhrase: string) {
  const { WalletManagerBase } = await loadWalletModules();
  return WalletManagerBase.isValidSeedPhrase(seedPhrase);
}

export async function createWalletManager(seedPhrase: string) {
  const { WalletManagerEvmErc4337 } = await loadWalletModules();
  return new WalletManagerEvmErc4337(seedPhrase, buildWalletManagerConfig());
}

export async function loadStoredWallet() {
  const walletConfig = await getLatestWalletConfig();

  if (!walletConfig) {
    return null;
  }

  const env = getEnv();
  const seedPhrase = decryptString(walletConfig.encryptedSeed, env.appEncryptionKey);
  const walletManager = await createWalletManager(seedPhrase);
  const account = await walletManager.getAccount(0);

  return {
    walletConfig,
    seedPhrase,
    walletManager,
    account,
  };
}
