import nacl from "tweetnacl";

type BuildAuthMessageInput = {
  domain: string;
  uri: string;
  wallet: string;
  nonce: string;
  issuedAt: string;
  expiresAt: string;
};

type VerifyAuthSignatureInput = {
  message: string;
  signature: number[];
  publicKey: Uint8Array;
};

export function buildAuthMessage({
  domain,
  uri,
  wallet,
  nonce,
  issuedAt,
  expiresAt,
}: BuildAuthMessageInput) {
  return [
    `${domain} wants you to sign in with your Solana account:`,
    wallet,
    "",
    "Sign in to CMC CardDex.",
    "",
    `URI: ${uri}`,
    "Version: 1",
    "Chain ID: solana:devnet",
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    `Expiration Time: ${expiresAt}`,
    "",
    "This request proves wallet ownership.",
    "It does not authorize a transaction or spending.",
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

  return nacl.sign.detached.verify(
    messageBytes,
    signatureBytes,
    publicKeyBytes
  );
}
