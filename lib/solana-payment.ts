type TokenAmount = {
  amount: string;
  decimals: number;
};

type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: TokenAmount;
};

type ParsedTransaction = {
  meta?: {
    err: unknown;
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
  } | null;
};

type ExtractPaymentInput = {
  finalized: boolean;
  expectedSender: string;
  expectedRecipient: string;
  expectedMint: string;
  transaction: ParsedTransaction | null;
};

type ExtractedPayment = {
  sender: string;
  recipient: string;
  mint: string;
  amount: bigint;
  finalized: boolean;
};

function findBalance(
  balances: TokenBalance[],
  owner: string,
  mint: string
) {
  return balances.find(
    (balance) =>
      balance.owner === owner &&
      balance.mint === mint
  );
}

function amountOf(balance: TokenBalance | undefined) {
  if (!balance) return BigInt(0);

  try {
    return BigInt(balance.uiTokenAmount.amount);
  } catch {
    return BigInt(0);
  }
}

export function extractUsdcPayment({
  finalized,
  expectedSender,
  expectedRecipient,
  expectedMint,
  transaction,
}: ExtractPaymentInput): ExtractedPayment | null {
  if (
    !finalized ||
    !transaction?.meta ||
    transaction.meta.err !== null
  ) {
    return null;
  }

  const preBalances =
    transaction.meta.preTokenBalances || [];
  const postBalances =
    transaction.meta.postTokenBalances || [];

  const senderBefore = findBalance(
    preBalances,
    expectedSender,
    expectedMint
  );
  const senderAfter = findBalance(
    postBalances,
    expectedSender,
    expectedMint
  );
  const recipientBefore = findBalance(
    preBalances,
    expectedRecipient,
    expectedMint
  );
  const recipientAfter = findBalance(
    postBalances,
    expectedRecipient,
    expectedMint
  );

  if (
    !senderBefore ||
    !senderAfter ||
    !recipientBefore ||
    !recipientAfter
  ) {
    return null;
  }

  if (
    senderBefore.uiTokenAmount.decimals !== 6 ||
    senderAfter.uiTokenAmount.decimals !== 6 ||
    recipientBefore.uiTokenAmount.decimals !== 6 ||
    recipientAfter.uiTokenAmount.decimals !== 6
  ) {
    return null;
  }

  const senderDecrease =
    amountOf(senderBefore) - amountOf(senderAfter);
  const recipientIncrease =
    amountOf(recipientAfter) -
    amountOf(recipientBefore);

  if (
    senderDecrease <= BigInt(0) ||
    recipientIncrease <= BigInt(0) ||
    senderDecrease !== recipientIncrease
  ) {
    return null;
  }

  return {
    sender: expectedSender,
    recipient: expectedRecipient,
    mint: expectedMint,
    amount: recipientIncrease,
    finalized: true,
  };
}
