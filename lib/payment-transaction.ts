import {
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const USDC_DECIMALS = 6;
const PAYMENT_AMOUNT_BASE_UNITS = BigInt(1_000_000);

type BuildUsdcPaymentTransactionInput = {
  payer: PublicKey;
  recipient: PublicKey;
  mint: PublicKey;
  recentBlockhash: string;
};

export function buildUsdcPaymentTransaction({
  payer,
  recipient,
  mint,
  recentBlockhash,
}: BuildUsdcPaymentTransactionInput) {
  const payerTokenAccount =
    getAssociatedTokenAddressSync(mint, payer);

  const recipientTokenAccount =
    getAssociatedTokenAddressSync(mint, recipient);

  const createRecipientAccount =
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      recipientTokenAccount,
      recipient,
      mint
    );

  const transfer =
    createTransferCheckedInstruction(
      payerTokenAccount,
      mint,
      recipientTokenAccount,
      payer,
      PAYMENT_AMOUNT_BASE_UNITS,
      USDC_DECIMALS
    );

  return new Transaction({
    feePayer: payer,
    recentBlockhash,
  }).add(createRecipientAccount, transfer);
}
