// @vitest-environment node

import nacl from "tweetnacl";

type BuildAuthMessageInput = {
  wallet: string;
  nonce: string;
  expiresAt: string;
};

type VerifyAuthSignatureInput = {
  message: string;
  signature: number[];
  publicKey: Uint8Array;
};

export function buildAuthMessage({
  wallet,
  nonce,
  expiresAt,
}: BuildAuthMessageInput) {
  return [
    "CMC CardDex wallet authentication",
    "",
    `wallet: ${wallet}`,
    `nonce: ${nonce}`,
    `expires at: ${expiresAt}`,
    "",
    "signing proves wallet ownership.",
    "this does not authorize a transaction or spending.",
  ].join("\n");
}

export function verifyAuthSignature({
  message,
  signature,
  publicKey,
}: VerifyAuthSignatureInput) {
  if (
    signature.length !== nacl.sign.signatureLength ||
    publicKey.length !== nacl.sign.publicKeyLength ||
    !signature.every(
      (value) =>
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 255
    )
  ) {
    return false;
  }

  const messageBytes = Uint8Array.from(
    new TextEncoder().encode(message)
  );
  const signatureBytes = Uint8Array.from(signature);
  const publicKeyBytes = Uint8Array.from(publicKey);
  }

  return nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    publicKeyBytes
  );
