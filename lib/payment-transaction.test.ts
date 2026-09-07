// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import {
  decodeTransferCheckedInstruction,
} from "@solana/spl-token";
import {
  buildUsdcPaymentTransaction,
} from "./payment-transaction";

describe("buildUsdcPaymentTransaction", () => {
  it("builds an exact 1 USDC transfer to the recipient", () => {
    const payer = Keypair.generate().publicKey;
    const recipient = new PublicKey(
      "4eSumg2jAbKyrr7arCm9RscjdcJiFfdka6x1PHjGsFhp"
    );
    const mint = new PublicKey(
      "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
    );

    const transaction = buildUsdcPaymentTransaction({
      payer,
      recipient,
      mint,
      recentBlockhash:
        "11111111111111111111111111111111",
    });

    expect(transaction.feePayer?.toBase58()).toBe(
      payer.toBase58()
    );
    expect(transaction.recentBlockhash).toBe(
      "11111111111111111111111111111111"
    );
    expect(transaction.instructions).toHaveLength(2);

    const transfer = decodeTransferCheckedInstruction(
      transaction.instructions[1]
    );

    expect(transfer.keys.owner.pubkey.toBase58()).toBe(
      payer.toBase58()
    );
    expect(
      transfer.keys.destination.pubkey.toBase58()
    ).not.toBe(payer.toBase58());
    expect(transfer.data.amount).toBe(BigInt(1_000_000));
    expect(transfer.data.decimals).toBe(6);
  });
});
