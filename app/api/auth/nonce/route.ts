import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { buildAuthMessage } from "../../../../lib/auth";
import {
  initializeDatabase,
  sql,
} from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const wallet = String(body.wallet || "").trim();

    try {
      new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        { error: "invalid Solana wallet" },
        { status: 400 }
      );
    }

    await initializeDatabase();

    const nonce = randomBytes(32).toString("hex");
    const expiresAt = new Date(
      Date.now() + 5 * 60 * 1000
    ).toISOString();

    const message = buildAuthMessage({
      wallet,
      nonce,
      expiresAt,
    });

    await sql`
      INSERT INTO carddex_auth_nonces (
        wallet,
        nonce,
        message,
        expires_at,
        used
      )
      VALUES (
        ${wallet},
        ${nonce},
        ${message},
        ${expiresAt},
        FALSE
      )
      ON CONFLICT (wallet)
      DO UPDATE SET
        nonce = EXCLUDED.nonce,
        message = EXCLUDED.message,
        expires_at = EXCLUDED.expires_at,
        used = FALSE,
        created_at = NOW()
    `;

    return NextResponse.json(
      {
        wallet,
        message,
        expiresAt,
      },
      {
        headers: {
          "cache-control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("authentication nonce error", error);

    return NextResponse.json(
      { error: "could not create authentication request" },
      { status: 500 }
    );
  }
}
