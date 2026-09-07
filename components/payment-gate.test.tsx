// @vitest-environment jsdom

import React from "react";
import {
  cleanup,
  render,
  screen,
} from "@testing-library/react";
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

vi.mock("@solana/wallet-adapter-react", () => ({
  useWallet: () => ({
    publicKey: null,
    connected: false,
    signMessage: undefined,
    sendTransaction: undefined,
  }),
  useConnection: () => ({
    connection: {},
  }),
}));

vi.mock(
  "@solana/wallet-adapter-react-ui",
  () => ({
    WalletMultiButton: () => (
      <button type="button">select wallet</button>
    ),
  })
);

import PaymentGate from "./payment-gate";

describe("PaymentGate", () => {
  afterEach(() => cleanup());

  it("asks a disconnected visitor to connect a wallet", () => {
    render(
      <PaymentGate>
        <div>private card catalogue</div>
      </PaymentGate>
    );

    expect(
      screen.getByRole("heading", {
        name: "unlock CMC CardDex",
      })
    ).toBeTruthy();

    expect(
      screen.getByRole("button", {
        name: "select wallet",
      })
    ).toBeTruthy();

    expect(
      screen.queryByText("private card catalogue")
    ).toBeNull();
  });
});
