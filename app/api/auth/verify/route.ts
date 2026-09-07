import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import {
  verifyAuthSignature,
} from "../../../../lib/auth";
import {
  createSessionToken,
} from "../../../../lib/session";
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
    const message = String(body.message || "");
    const signature = body.signature;

    let publicKey: PublicKey;

    try {
      publicKey = new PublicKey(wallet);
    } catch {
      return NextResponse.json(
        { error: "invalid Solana wallet" },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(signature) ||
      signature.length !== 64 ||
      !signature.every(
        (value) =>
          Number.isInteger(value) &&
          value >= 0 &&
          value <= 255
      )
    ) {
      return NextResponse.json(
        { error: "invalid wallet signature" },
        { status: 400 }
      );
    }

    await initializeDatabase();

    const nonceRows = await sql`
      SELECT message, expires_at, used
      FROM carddex_auth_nonces
      WHERE wallet = ${wallet}
      LIMIT 1
    `;

    const nonce = nonceRows[0];

    if (
      !nonce ||
      nonce.used ||
      nonce.message !== message ||
      new Date(nonce.expires_at).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "authentication request is invalid" },
        { status: 400 }
      );
    }

    const verified = verifyAuthSignature({
      message,
      signature,
      publicKey: publicKey.toBytes(),
    });

    if (!verified) {
      return NextResponse.json(
        { error: "wallet signature could not be verified" },
        { status: 401 }
      );
    }

    const consumed = await sql`
      UPDATE carddex_auth_nonces
      SET used = TRUE
      WHERE wallet = ${wallet}
        AND used = FALSE
        AND expires_at > NOW()
        AND message = ${message}
      RETURNING wallet
    `;

    if (consumed.length !== 1) {
      return NextResponse.json(
        { error: "authentication request was already used" },
        { status: 409 }
      );
    }

    const accessRows = await sql`
      SELECT wallet
      FROM carddex_access
      WHERE wallet = ${wallet}
      LIMIT 1
    `;

    if (accessRows.length !== 1) {
      return NextResponse.json(
        {
          authenticated: true,
          hasAccess: false,
          wallet,
        },
        { status: 402 }
      );
    }

    const secret = process.env.CARDDEX_SESSION_SECRET;

    if (!secret) {
      throw new Error(
        "CARDDEX_SESSION_SECRET is not configured"
      );
    }

    const token = await createSessionToken({
      wallet,
      secret,
    });

    const response = NextResponse.json({
      authenticated: true,
      hasAccess: true,
      wallet,
    });

    response.cookies.set("carddex_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("wallet authentication error", error);

    return NextResponse.json(
      { error: "wallet authentication failed" },
      { status: 500 }
    );
  }
}
