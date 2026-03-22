import { getEnv } from "@/lib/config/env";
import { mapWalletConfigToSummary, saveWalletConfig } from "@/lib/db/repositories/wallet-config";
import type { WalletSummary } from "@/lib/types";
import { encryptString } from "@/lib/utils/encryption";
import {
  createRandomSeedPhrase,
  createWalletManager,
  isValidSeedPhrase,
} from "@/lib/wallet/client";
import type { WalletSetupInput } from "@/lib/wallet/types";

export async function createWallet(input: WalletSetupInput): Promise<WalletSummary> {
  const env = getEnv();
  const network = input.network ?? env.wdkNetwork;
  const seedPhrase = input.seedPhrase ?? (await createRandomSeedPhrase());

  if (!(await isValidSeedPhrase(seedPhrase))) {
    throw new Error("Seed phrase is invalid.");
  }

  const walletManager = await createWalletManager(seedPhrase);

  try {
    const account = await walletManager.getAccount(0);
    const publicAddress = await account.getAddress();

    await saveWalletConfig({
      network,
      walletType: "erc-4337",
      publicAddress,
      encryptedSeed: encryptString(seedPhrase, env.appEncryptionKey),
    });

    return mapWalletConfigToSummary({
      network,
      publicAddress,
      asset: env.wdkAssetSymbol,
      walletType: "erc-4337",
    });
  } finally {
    walletManager.dispose();
  }
}
