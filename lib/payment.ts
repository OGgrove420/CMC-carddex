export type PaymentTransfer = {
  sender: string;
  recipient: string;
  mint: string;
  amount: bigint;
  finalized: boolean;
};

type ValidationInput = {
  expectedSender: string;
  expectedRecipient: string;
  expectedMint: string;
  expectedAmount: bigint;
  transfer: PaymentTransfer;
};

type ValidationResult = {
  valid: boolean;
  error: string | null;
};

export function validatePaymentTransfer({
  expectedSender,
  expectedRecipient,
  expectedMint,
  expectedAmount,
  transfer,
}: ValidationInput): ValidationResult {
  if (!transfer.finalized) {
    return {
      valid: false,
      error: "transaction is not finalized",
    };
  }

  if (transfer.sender !== expectedSender) {
    return {
      valid: false,
      error: "payment sender does not match wallet",
    };
  }

  if (transfer.recipient !== expectedRecipient) {
    return {
      valid: false,
      error: "payment recipient is incorrect",
    };
  }

  if (transfer.mint !== expectedMint) {
    return {
      valid: false,
      error: "payment token is not accepted",
    };
  }

  if (transfer.amount !== expectedAmount) {
    return {
      valid: false,
      error: "payment amount is incorrect",
    };
  }

  return {
    valid: true,
    error: null,
  };
}
