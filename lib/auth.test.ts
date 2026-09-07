// @vitest-environment node

import { describe, expect, it } from "vitest";
import nacl from "tweetnacl";
import {
  buildAuthMessage,
  verifyAuthSignature,
} from "./auth";

describe("CardDex wallet authentication", () => {
  it("uses a Sign In With Solana compatible message", () => {
    const message = buildAuthMessage({
      domain: "cmc-carddex.vercel.app",
      uri: "https://cmc-carddex.vercel.app",
      wallet:
        "6YaDPJyrBbme51zsN7L3QHn7NZkRb6qWyyG4i42SVcEN",
      nonce: "8d70c847ec28d297",
      issuedAt: "2026-09-07T18:25:00.000Z",
      expiresAt: "2026-09-07T18:30:00.000Z",
    });

    expect(message).toContain(
      "cmc-carddex.vercel.app wants you to sign in with your Solana account:"
    );

    expect(message).toContain(
      "6YaDPJyrBbme51zsN7L3QHn7NZkRb6qWyyG4i42SVcEN"
    );

    expect(message).toContain(
      "URI: https://cmc-carddex.vercel.app"
    );

    expect(message).toContain("Version: 1");
    expect(message).toContain("Chain ID: solana:devnet");

    expect(message).toContain(
      "Nonce: 8d70c847ec28d297"
    );

    expect(message).toContain(
      "Issued At: 2026-09-07T18:25:00.000Z"
    );

    expect(message).toContain(
      "Expiration Time: 2026-09-07T18:30:00.000Z"
    );
  });

  it("verifies the exact signed message", () => {
    const keypair = nacl.sign.keyPair();
    const message = "standard authentication message";

    const messageBytes = Uint8Array.from(
      new TextEncoder().encode(message)
    );

    const secretKey = Uint8Array.from(
      keypair.secretKey
    );

    const signature = nacl.sign.detached(
      messageBytes,
      secretKey
    );

    expect(
      verifyAuthSignature({
        message,
        signature: Array.from(signature),
        publicKey: Uint8Array.from(
          keypair.publicKey
        ),
      })
    ).toBe(true);

    expect(
      verifyAuthSignature({
        message: `${message} changed`,
        signature: Array.from(signature),
        publicKey: Uint8Array.from(
          keypair.publicKey
        ),
      })
    ).toBe(false);
  });
});
