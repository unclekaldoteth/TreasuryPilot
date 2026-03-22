import { getEnv } from "@/lib/config/env";
import { getLatestWalletConfig } from "@/lib/db/repositories/wallet-config";
import { formatBaseUnitAmount } from "@/lib/utils/money";
import { loadStoredWallet } from "@/lib/wallet/client";
import type { WalletBalanceSnapshot } from "@/lib/wallet/types";

export async function getWalletBalance(): Promise<WalletBalanceSnapshot> {
  const env = getEnv();
  let walletConfig: Awaited<ReturnType<typeof getLatestWalletConfig>> = null;

  try {
    walletConfig = await getLatestWalletConfig();
  } catch (error) {
    return {
      network: env.wdkNetwork,
      address: "",
      asset: env.wdkAssetSymbol,
      balance: "unavailable",
      status: "error",
      walletType: "erc-4337",
      tokenAddress: env.wdkPaymasterTokenAddress,
      error: error instanceof Error ? error.message : "Unable to reach the wallet configuration store.",
    };
  }

  if (!walletConfig) {
    return {
      network: env.wdkNetwork,
      address: "",
      asset: env.wdkAssetSymbol,
      balance: "0",
      status: "missing",
      walletType: "erc-4337",
      tokenAddress: env.wdkPaymasterTokenAddress,
      error: "Wallet has not been initialized.",
    };
  }

  let loadedWallet: Awaited<ReturnType<typeof loadStoredWallet>> = null;

  try {
    loadedWallet = await loadStoredWallet();

    if (!loadedWallet) {
      return {
        network: walletConfig.network,
        address: walletConfig.publicAddress,
        asset: env.wdkAssetSymbol,
        balance: "0",
        status: "missing",
        walletType: "erc-4337",
        tokenAddress: env.wdkPaymasterTokenAddress,
        error: "Wallet has not been initialized.",
      };
    }

    const [address, rawNativeBalance, rawTokenBalance] = await Promise.all([
      loadedWallet.account.getAddress(),
      loadedWallet.account.getBalance(),
      loadedWallet.account.getTokenBalance(env.wdkPaymasterTokenAddress),
    ]);

    return {
      network: walletConfig.network,
      address,
      asset: env.wdkAssetSymbol,
      balance: formatBaseUnitAmount(rawTokenBalance, env.wdkAssetDecimals),
      rawTokenBalance: rawTokenBalance.toString(),
      rawNativeBalance: rawNativeBalance.toString(),
      status: "connected",
      walletType: "erc-4337",
      tokenAddress: env.wdkPaymasterTokenAddress,
    };
  } catch (error) {
    return {
      network: walletConfig.network,
      address: walletConfig.publicAddress,
      asset: env.wdkAssetSymbol,
      balance: "unavailable",
      status: "error",
      walletType: "erc-4337",
      tokenAddress: env.wdkPaymasterTokenAddress,
      error: error instanceof Error ? error.message : "Unexpected wallet balance error.",
    };
  } finally {
    loadedWallet?.walletManager.dispose();
  }
}
