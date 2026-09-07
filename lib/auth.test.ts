import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import {
  buildAuthMessage,
  verifyAuthSignature,
} from "./auth";

describe("CardDex wallet authentication", () => {
  it("verifies a signature for the exact wallet challenge", () => {
    const keypair = nacl.sign.keyPair();
    const wallet = Buffer.from(
      keypair.publicKey
    ).toString("hex");

    const message = buildAuthMessage({
      wallet,
      nonce: "test-nonce-123",
      expiresAt: "2026-09-07T12:00:00.000Z",
    });

    const messageBytes = Uint8Array.from(
      new TextEncoder().encode(message)
    );
    const secretKey = Uint8Array.from(keypair.secretKey);

    const signature = nacl.sign.detached(
      messageBytes,
      secretKey
    );

    expect(
      verifyAuthSignature({
        message,
        signature: Array.from(signature),
        publicKey: keypair.publicKey,
      })
    ).toBe(true);

    expect(
      verifyAuthSignature({
        message: `${message} changed`,
        signature: Array.from(signature),
        publicKey: keypair.publicKey,
      })
    ).toBe(false);
  });
});
