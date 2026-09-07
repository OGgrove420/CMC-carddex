import { NextResponse } from "next/server";
import {
  clusterApiUrl,
  Connection,
  PublicKey,
} from "@solana/web3.js";
import {
  initializeDatabase,
  sql,
} from "../../../../lib/db";
import { validatePaymentTransfer } from "../../../../lib/payment";
import { extractUsdcPayment } from "../../../../lib/solana-payment";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAYMENT_AMOUNT_BASE_UNITS = BigInt(1_000_000);

function getConnection() {
  const cluster = process.env.SOLANA_CLUSTER;

  if (
    cluster !== "devnet" &&
    cluster !== "mainnet-beta"
  ) {
    throw new Error("SOLANA_CLUSTER is not configured");
  }

  const endpoint =
    process.env.SOLANA_RPC_URL || clusterApiUrl(cluster);

  return {
    cluster,
    connection: new Connection(endpoint, "finalized"),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const wallet = String(body.wallet || "").trim();
    const transactionSignature = String(
      body.transactionSignature || ""
    ).trim();

    try {
      new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        { error: "invalid Solana wallet" },
        { status: 400 }
      );
    }

    if (
      !/^[1-9A-HJ-NP-Za-km-z]{64,100}$/.test(
        transactionSignature
      )
    ) {
      return NextResponse.json(
        { error: "invalid transaction signature" },
        { status: 400 }
      );
    }

    const recipient =
      process.env.SOLANA_PAYMENT_RECIPIENT;
    const usdcMint = process.env.SOLANA_USDC_MINT;

    if (!recipient || !usdcMint) {
      throw new Error(
        "Solana payment configuration is incomplete"
      );
    }

    new PublicKey(recipient);
    new PublicKey(usdcMint);

    await initializeDatabase();

    const existingAccess = await sql`
      SELECT wallet, transaction_signature
      FROM carddex_access
      WHERE wallet = ${wallet}
         OR transaction_signature = ${transactionSignature}
      LIMIT 1
    `;

    if (existingAccess.length > 0) {
      if (
        existingAccess[0].wallet === wallet &&
        existingAccess[0].transaction_signature ===
          transactionSignature
      ) {
        return NextResponse.json({
          success: true,
          hasAccess: true,
          alreadyVerified: true,
          wallet,
        });
      }

      return NextResponse.json(
        {
          error:
            "wallet or transaction has already been claimed",
        },
        { status: 409 }
      );
    }

    const claimRows = await sql`
      INSERT INTO carddex_payment_claims (
        transaction_signature,
        wallet,
        status
      )
      VALUES (
        ${transactionSignature},
        ${wallet},
        'pending'
      )
      ON CONFLICT (transaction_signature) DO NOTHING
      RETURNING transaction_signature
    `;

    if (claimRows.length !== 1) {
      return NextResponse.json(
        { error: "payment claim is already being processed" },
        { status: 409 }
      );
    }

    const { cluster, connection } = getConnection();

    const [statusResult, transaction] =
      await Promise.all([
        connection.getSignatureStatuses(
          [transactionSignature],
          {
            searchTransactionHistory: true,
          }
        ),
        connection.getParsedTransaction(
          transactionSignature,
          {
            commitment: "finalized",
            maxSupportedTransactionVersion: 0,
          }
        ),
      ]);

    const signatureStatus = statusResult.value[0];
    const finalized =
      signatureStatus?.confirmationStatus === "finalized" &&
      signatureStatus.err === null;

    const transfer = extractUsdcPayment({
      finalized,
      expectedSender: wallet,
      expectedRecipient: recipient,
      expectedMint: usdcMint,
      transaction,
    });

    const validation = transfer
      ? validatePaymentTransfer({
          expectedSender: wallet,
          expectedRecipient: recipient,
          expectedMint: usdcMint,
          expectedAmount: PAYMENT_AMOUNT_BASE_UNITS,
          transfer,
        })
      : {
          valid: false,
          error:
            "finalized USDC payment could not be verified",
        };

    if (!validation.valid || !transfer) {
      await sql`
        UPDATE carddex_payment_claims
        SET
          status = 'rejected',
          error = ${validation.error},
          updated_at = NOW()
        WHERE transaction_signature =
          ${transactionSignature}
      `;

      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const paidAt = transaction?.blockTime
      ? new Date(transaction.blockTime * 1000).toISOString()
      : new Date().toISOString();

    const accessRows = await sql`
      INSERT INTO carddex_access (
        wallet,
        transaction_signature,
        cluster,
        token_mint,
        amount_base_units,
        recipient,
        paid_at
      )
      VALUES (
        ${wallet},
        ${transactionSignature},
        ${cluster},
        ${usdcMint},
        ${transfer.amount.toString()},
        ${recipient},
        ${paidAt}
      )
      ON CONFLICT DO NOTHING
      RETURNING wallet
    `;

    if (accessRows.length !== 1) {
      await sql`
        UPDATE carddex_payment_claims
        SET
          status = 'rejected',
          error = 'wallet or transaction was already claimed',
          updated_at = NOW()
        WHERE transaction_signature =
          ${transactionSignature}
      `;

      return NextResponse.json(
        {
          error:
            "wallet or transaction was already claimed",
        },
        { status: 409 }
      );
    }

    await sql`
      UPDATE carddex_payment_claims
      SET
        status = 'verified',
        error = NULL,
        updated_at = NOW()
      WHERE transaction_signature =
        ${transactionSignature}
    `;

    return NextResponse.json({
      success: true,
      hasAccess: true,
      wallet,
      cluster,
      amountBaseUnits: transfer.amount.toString(),
      transactionSignature,
    });
  } catch (error) {
    console.error("payment claim error", error);

    return NextResponse.json(
      { error: "payment verification failed" },
      { status: 500 }
    );
  }
}
