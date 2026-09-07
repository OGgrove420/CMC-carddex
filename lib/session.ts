import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

const SESSION_DURATION_SECONDS = 24 * 60 * 60;

type CreateSessionTokenInput = {
  wallet: string;
  secret: string;
  now?: number;
};

type VerifySessionTokenInput = {
  token: string;
  secret: string;
  now?: number;
};

type SessionPayload = {
  wallet: string;
  issuedAt: number;
  expiresAt: number;
};

type SessionResult =
  | {
      valid: true;
      wallet: string;
    }
  | {
      valid: false;
      wallet: null;
    };

function assertSecret(secret: string) {
  if (secret.length < 32) {
    throw new Error(
      "session secret must be at least 32 characters"
    );
  }
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export async function createSessionToken({
  wallet,
  secret,
  now = Math.floor(Date.now() / 1000),
}: CreateSessionTokenInput) {
  assertSecret(secret);

  const payload: SessionPayload = {
    wallet,
    issuedAt: now,
    expiresAt: now + SESSION_DURATION_SECONDS,
  };

  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
    "utf8"
  ).toString("base64url");

  return `${encodedPayload}.${sign(encodedPayload, secret)}`;
}

export async function verifySessionToken({
  token,
  secret,
  now = Math.floor(Date.now() / 1000),
}: VerifySessionTokenInput): Promise<SessionResult> {
  try {
    assertSecret(secret);

    const [encodedPayload, suppliedSignature, extra] =
      token.split(".");

    if (
      !encodedPayload ||
      !suppliedSignature ||
      extra !== undefined
    ) {
      return {
        valid: false,
        wallet: null,
      };
    }

    const expectedSignature = sign(
      encodedPayload,
      secret
    );
    const suppliedBytes = Buffer.from(
      suppliedSignature,
      "utf8"
    );
    const expectedBytes = Buffer.from(
      expectedSignature,
      "utf8"
    );

    if (
      suppliedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(suppliedBytes, expectedBytes)
    ) {
      return {
        valid: false,
        wallet: null,
      };
    }

    const payload = JSON.parse(
      Buffer.from(
        encodedPayload,
        "base64url"
      ).toString("utf8")
    ) as Partial<SessionPayload>;

    if (
      typeof payload.wallet !== "string" ||
      !payload.wallet ||
      typeof payload.issuedAt !== "number" ||
      typeof payload.expiresAt !== "number" ||
      payload.issuedAt > now + 60 ||
      payload.expiresAt <= now
    ) {
      return {
        valid: false,
        wallet: null,
      };
    }

    return {
      valid: true,
      wallet: payload.wallet,
    };
  } catch {
    return {
      valid: false,
      wallet: null,
    };
  }
}
