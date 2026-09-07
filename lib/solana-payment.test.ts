// @vitest-environment node

import { describe, expect, it } from "vitest";
import { extractUsdcPayment } from "./solana-payment";

describe("extractUsdcPayment", () => {
  it("extracts an exact finalized token transfer", () => {
    const result = extractUsdcPayment({
      finalized: true,
      expectedSender:
        "Sender111111111111111111111111111111111111",
      expectedRecipient:
        "Recipient11111111111111111111111111111111",
      expectedMint:
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      transaction: {
        meta: {
          err: null,
          preTokenBalances: [
            {
              accountIndex: 1,
              mint:
                "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
              owner:
                "Sender111111111111111111111111111111111111",
              uiTokenAmount: {
                amount: "2000000",
                decimals: 6,
              },
            },
            {
              accountIndex: 2,
              mint:
                "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
              owner:
                "Recipient11111111111111111111111111111111",
              uiTokenAmount: {
                amount: "5000000",
                decimals: 6,
              },
            },
          ],
          postTokenBalances: [
            {
              accountIndex: 1,
              mint:
                "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
              owner:
                "Sender111111111111111111111111111111111111",
              uiTokenAmount: {
                amount: "1000000",
                decimals: 6,
              },
            },
            {
              accountIndex: 2,
              mint:
                "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
              owner:
                "Recipient11111111111111111111111111111111",
              uiTokenAmount: {
                amount: "6000000",
                decimals: 6,
              },
            },
          ],
        },
      },
    });

    expect(result).toEqual({
      sender:
        "Sender111111111111111111111111111111111111",
      recipient:
        "Recipient11111111111111111111111111111111",
      mint:
        "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
      amount: 1_000_000n,
      finalized: true,
    });
  });
});
