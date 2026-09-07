import { NextResponse } from "next/server";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
} from "@solana/web3.js";
import {
  buildUsdcPaymentTransaction,
} from "../../../../lib/payment-transaction";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPaymentConfiguration() {
  const cluster = process.env.SOLANA_CLUSTER;
  const recipientAddress =
    process.env.SOLANA_PAYMENT_RECIPIENT;
  const mintAddress = process.env.SOLANA_USDC_MINT;

  if (
    cluster !== "devnet" &&
    cluster !== "mainnet-beta"
  ) {
    throw new Error("SOLANA_CLUSTER is not configured");
  }

  if (!recipientAddress || !mintAddress) {
    throw new Error(
      "Solana payment configuration is incomplete"
    );
  }

  const endpoint =
    process.env.SOLANA_RPC_URL || clusterApiUrl(cluster);

  return {
    cluster,
    connection: new Connection(endpoint, "finalized"),
    recipient: new PublicKey(recipientAddress),
    mint: new PublicKey(mintAddress),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const wallet = String(body.wallet || "").trim();

    let payer: PublicKey;

    try {
      payer = new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        { error: "invalid Solana wallet" },
        { status: 400 }
      );
    }

    const {
      cluster,
      connection,
      recipient,
      mint,
    } = getPaymentConfiguration();

    const {
      blockhash,
      lastValidBlockHeight,
    } = await connection.getLatestBlockhash("finalized");

    const transaction = buildUsdcPaymentTransaction({
      payer,
      recipient,
      mint,
      recentBlockhash: blockhash,
    });

    const serializedTransaction = transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString("base64");

    return NextResponse.json(
      {
        transaction: serializedTransaction,
        cluster,
        blockhash,
        lastValidBlockHeight,
        recipient: recipient.toBase58(),
        mint: mint.toBase58(),
        amountBaseUnits: "1000000",
        decimals: 6,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error(
      "payment transaction creation error",
      error
    );

    return NextResponse.json(
      { error: "could not create payment transaction" },
      { status: 500 }
    );
  }
}
