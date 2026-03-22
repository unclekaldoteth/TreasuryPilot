import { NextResponse } from "next/server";
import { getEnv } from "@/lib/config/env";
import {
  getLatestWalletConfig,
  mapWalletConfigToSummary,
} from "@/lib/db/repositories/wallet-config";
import { createWallet } from "@/lib/wallet/create-wallet";
import { getWalletClientConfig } from "@/lib/wallet/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const env = getEnv();
  const walletConfig = await getLatestWalletConfig();
  const wallet = walletConfig
    ? mapWalletConfigToSummary({
        network: walletConfig.network,
        publicAddress: walletConfig.publicAddress,
        asset: env.wdkAssetSymbol,
        walletType: walletConfig.walletType,
      })
    : {
        network: env.wdkNetwork,
        address: "",
        asset: env.wdkAssetSymbol,
        balance: "unfetched",
        status: "missing" as const,
        walletType: "erc-4337",
        error: "Wallet has not been initialized.",
      };

  return NextResponse.json({
    wallet,
    client: getWalletClientConfig(),
  });
}

export async function POST(request: Request) {
  let body: { seedPhrase?: string; force?: boolean } = {};

  try {
    body = (await request.json()) as { seedPhrase?: string; force?: boolean };
  } catch {
    body = {};
  }

  try {
    const existingWalletConfig = await getLatestWalletConfig();

    if (existingWalletConfig && !body.force) {
      return NextResponse.json(
        {
          error:
            "A wallet is already stored for this environment. Refusing to overwrite it without force=true.",
        },
        { status: 409 },
      );
    }

    const wallet = await createWallet({
      network: getEnv().wdkNetwork,
      seedPhrase: body.seedPhrase,
    });

    return NextResponse.json({ wallet });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Wallet creation failed.",
      },
      { status: 400 },
    );
  }
}
