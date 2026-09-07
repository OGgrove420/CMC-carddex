"use client";

import React, {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { Transaction } from "@solana/web3.js";

type PaymentGateProps = {
  children: React.ReactNode;
};

type AuthResult = {
  authenticated?: boolean;
  hasAccess?: boolean;
  error?: string;
};

function decodeTransaction(value: string) {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return Transaction.from(bytes);
}

export default function PaymentGate({
  children,
}: PaymentGateProps) {
  const { connection } = useConnection();
  const {
    publicKey,
    connected,
    signMessage,
    sendTransaction,
  } = useWallet();

  const [hasAccess, setHasAccess] = useState(false);
  const [checking, setChecking] = useState(false);
  const [paying, setPaying] = useState(false);
  const [status, setStatus] = useState(
    "connect a supported Solana wallet"
  );

  const authenticate = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setHasAccess(false);
      setStatus(
        connected
          ? "this wallet cannot sign authentication messages"
          : "connect a supported Solana wallet"
      );
      return false;
    }

    setChecking(true);
    setStatus("approve the access message in your wallet");

    try {
      const wallet = publicKey.toBase58();

      const nonceResponse = await fetch(
        "/api/auth/nonce",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ wallet }),
        }
      );

      const nonceData = await nonceResponse.json();

      if (!nonceResponse.ok) {
        throw new Error(
          nonceData.error ||
            "could not create authentication request"
        );
      }

      const message = String(nonceData.message);
      const signature = await signMessage(
        new TextEncoder().encode(message)
      );

      const verifyResponse = await fetch(
        "/api/auth/verify",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            wallet,
            message,
            signature: Array.from(signature),
          }),
        }
      );

      const verifyData =
        (await verifyResponse.json()) as AuthResult;

      if (
        verifyResponse.status === 402 &&
        verifyData.authenticated
      ) {
        setHasAccess(false);
        setStatus("one-time payment required");
        return false;
      }

      if (!verifyResponse.ok || !verifyData.hasAccess) {
        throw new Error(
          verifyData.error ||
            "wallet access could not be verified"
        );
      }

      setHasAccess(true);
      setStatus("access verified");
      return true;
    } catch (error) {
      setHasAccess(false);
      setStatus(
        error instanceof Error
          ? error.message
          : "wallet authentication failed"
      );
      return false;
    } finally {
      setChecking(false);
    }
  }, [connected, publicKey, signMessage]);

  useEffect(() => {
    setHasAccess(false);

    if (connected && publicKey && signMessage) {
      authenticate();
    } else {
      setStatus("connect a supported Solana wallet");
    }
  }, [authenticate, connected, publicKey, signMessage]);

  const payForAccess = useCallback(async () => {
    if (!publicKey || !sendTransaction) {
      setStatus("connect a wallet before paying");
      return;
    }

    setPaying(true);
    setStatus(
      "creating the 1 USDC devnet test transaction"
    );

    try {
      const wallet = publicKey.toBase58();

      const transactionResponse = await fetch(
        "/api/payment/transaction",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({ wallet }),
        }
      );

      const transactionData =
        await transactionResponse.json();

      if (!transactionResponse.ok) {
        throw new Error(
          transactionData.error ||
            "could not create payment transaction"
        );
      }

      const transaction = decodeTransaction(
        String(transactionData.transaction)
      );

      setStatus(
        "review and approve the 1 USDC devnet transaction"
      );

      const transactionSignature = await sendTransaction(
        transaction,
        connection
      );

      setStatus("waiting for final confirmation");

      await connection.confirmTransaction(
        {
          signature: transactionSignature,
          blockhash: String(transactionData.blockhash),
          lastValidBlockHeight: Number(
            transactionData.lastValidBlockHeight
          ),
        },
        "finalized"
      );

      setStatus("verifying payment on Solana");

      const claimResponse = await fetch(
        "/api/payment/claim",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          body: JSON.stringify({
            wallet,
            transactionSignature,
          }),
        }
      );

      const claimData = await claimResponse.json();

      if (!claimResponse.ok || !claimData.hasAccess) {
        throw new Error(
          claimData.error || "payment could not be verified"
        );
      }

      setStatus("payment verified. confirm wallet access");
      await authenticate();
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "payment failed"
      );
    } finally {
      setPaying(false);
    }
  }, [
    authenticate,
    connection,
    publicKey,
    sendTransaction,
  ]);

  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <main className="gate-page">
      <section className="gate-card">
        <p className="eyebrow">
          CONSCIOUS MIND CONCEPTS
        </p>

        <h1>unlock CMC CardDex</h1>

        <p className="tagline">
          one wallet. one payment. permanent CardDex access.
          help build minds one mind at a time.
        </p>

        <div className="gate-price">
          <strong>1 USDC</strong>
          <span>one-time access</span>
        </div>

        <div className="gate-wallet">
          <WalletMultiButton />
        </div>

        {connected && (
          <>
            <button
              className="gate-action"
              type="button"
              disabled={
                checking ||
                paying ||
                !publicKey ||
                !sendTransaction
              }
              onClick={payForAccess}
            >
              {paying
                ? "verifying payment…"
                : "pay 1 USDC and unlock"}
            </button>

            <button
              className="gate-secondary"
              type="button"
              disabled={checking || paying || !signMessage}
              onClick={authenticate}
            >
              {checking
                ? "checking access…"
                : "i already paid"}
            </button>
          </>
        )}

        <p className="gate-status">{status}</p>

        <p className="gate-warning">
          devnet testing only. devnet USDC has no financial
          value. never enter a seed phrase or private key.
        </p>
      </section>
    </main>
  );
}
