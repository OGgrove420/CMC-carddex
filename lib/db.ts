import { neon } from "@neondatabase/serverless";

let initialized = false;

function getSql() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
  }

  return neon(databaseUrl);
}

export function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
) {
  return getSql()(strings, ...values);
}

export async function initializeDatabase() {
  if (initialized) return;

  await sql`
    CREATE TABLE IF NOT EXISTS carddex_auth_nonces (
      wallet TEXT PRIMARY KEY,
      nonce TEXT NOT NULL,
      message TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS carddex_access (
      wallet TEXT PRIMARY KEY,
      transaction_signature TEXT NOT NULL UNIQUE,
      cluster TEXT NOT NULL,
      token_mint TEXT NOT NULL,
      amount_base_units BIGINT NOT NULL,
      recipient TEXT NOT NULL,
      paid_at TIMESTAMPTZ NOT NULL,
      verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS carddex_payment_claims (
      transaction_signature TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      status TEXT NOT NULL CHECK (
        status IN ('pending', 'verified', 'rejected')
      ),
      error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS
    carddex_payment_claims_wallet_idx
    ON carddex_payment_claims (wallet)
  `;

  initialized = true;
}
