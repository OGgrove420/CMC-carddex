// @vitest-environment jsdom

import React from "react";
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import Page from "./page";

const catalogueResponse = {
  cards: [
    {
      id: "sv-test-1",
      name: "Pikachu",
      number: "25",
      rarity: "Illustration Rare",
      set: {
        id: "sv-test",
        name: "Test Set",
      },
      images: {
        small: "https://example.com/pikachu.png",
        large: "https://example.com/pikachu-large.png",
      },
    },
  ],
  page: 1,
  pageSize: 24,
  totalCount: 1,
  sets: [
    {
      id: "sv-test",
      name: "Test Set",
    },
  ],
};

describe("CMC CardDex", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => catalogueResponse,
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("loads verified cards from the server catalogue", async () => {
    render(<Page />);

    expect(
      screen.getByRole("heading", {
        name: "CMC CardDex",
      })
    ).toBeTruthy();

    await waitFor(() => {
      expect(screen.getByText("Pikachu")).toBeTruthy();
    });

    expect(screen.getByText("Test Set")).toBeTruthy();
    expect(screen.getByText("#25")).toBeTruthy();
    expect(
      screen.getByText("Illustration Rare")
    ).toBeTruthy();
  });
});
