// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
} from "./session";

describe("CardDex access session", () => {
  it("creates a wallet-bound signed session token", async () => {
    const secret =
      "test-secret-that-is-at-least-thirty-two-characters";
    const wallet =
      "6YaDPJyrBbme51zsN7L3QHn7NZkRb6qWyyG4i42SVcEN";

    const token = await createSessionToken({
      wallet,
      secret,
      now: 1_700_000_000,
    });

    const result = await verifySessionToken({
      token,
      secret,
      now: 1_700_000_100,
    });

    expect(result).toEqual({
      valid: true,
      wallet,
    });
  });

  it("rejects an expired session token", async () => {
    const secret =
      "test-secret-that-is-at-least-thirty-two-characters";
    const token = await createSessionToken({
      wallet: "test-wallet",
      secret,
      now: 1_700_000_000,
    });

    const result = await verifySessionToken({
      token,
      secret,
      now: 1_700_086_401,
    });

    expect(result.valid).toBe(false);
  });
});
