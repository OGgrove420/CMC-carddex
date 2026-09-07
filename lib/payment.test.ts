import { describe, expect, it } from "vitest";
import { validatePaymentTransfer } from "./payment";

describe("validatePaymentTransfer", () => {
  it("accepts one finalized USDC payment to the configured recipient", () => {
    const result = validatePaymentTransfer({
      expectedSender:
        "Sender111111111111111111111111111111111111",
      expectedRecipient:
        "Recipient11111111111111111111111111111111",
      expectedMint:
        "UsdcMint111111111111111111111111111111111",
      expectedAmount: 1_000_000n,
      transfer: {
        sender:
          "Sender111111111111111111111111111111111111",
        recipient:
          "Recipient11111111111111111111111111111111",
        mint:
          "UsdcMint111111111111111111111111111111111",
        amount: 1_000_000n,
        finalized: true,
      },
    });

    expect(result).toEqual({
      valid: true,
      error: null,
    });
  });
});
