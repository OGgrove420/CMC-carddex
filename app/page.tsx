"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type CardItem = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  artist?: string;
  supertype?: string;
  subtypes?: string[];
  set: {
    id: string;
    name: string;
  };
  images: {
    small: string;
    large: string;
  };
};

type SetItem = {
  id: string;
  name: string;
};

type CatalogueResponse = {
  cards: CardItem[];
  page: number;
  pageSize: number;
  totalCount: number;
  sets: SetItem[];
  error?: string;
};

function readStoredIds(key: string) {
  if (typeof window === "undefined") return [];

  try {
    const value = JSON.parse(
      window.localStorage.getItem(key) || "[]"
    );

    return Array.isArray(value)
      ? value.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

export default function Page() {
  const [cards, setCards] = useState<CardItem[]>([]);
  const [sets, setSets] = useState<SetItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSet, setSelectedSet] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [totalCount, setTotalCount] = useState(0);
  const [owned, setOwned] = useState<string[]>([]);
  const [wanted, setWanted] = useState<string[]>([]);
  const [status, setStatus] = useState(
    "loading verified catalogue"
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setOwned(readStoredIds("cmc-carddex-owned"));
    setWanted(readStoredIds("cmc-carddex-wanted"));
  }, []);

  const loadCards = useCallback(async () => {
    setLoading(true);
    setStatus("loading verified catalogue");

    try {
      const params = new URLSearchParams({
        page: String(page),
      });

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (selectedSet) {
        params.set("set", selectedSet);
      }

      const response = await fetch(
        `/api/cards?${params.toString()}`,
        {
          cache: "no-store",
        }
      );

      const data =
        (await response.json()) as CatalogueResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "catalogue provider unavailable"
        );
      }

      setCards(data.cards || []);
      setSets(data.sets || []);
      setPageSize(data.pageSize || 24);
      setTotalCount(data.totalCount || 0);
      setStatus("verified catalogue");
    } catch (error) {
      setCards([]);
      setStatus(
        error instanceof Error
          ? error.message
          : "could not load catalogue"
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedSet]);

  useEffect(() => {
    const timer = window.setTimeout(loadCards, 350);
    return () => window.clearTimeout(timer);
  }, [loadCards]);

  const saveList = (
    key: string,
    values: string[],
    setter: (values: string[]) => void
  ) => {
    setter(values);

    try {
      window.localStorage.setItem(
        key,
        JSON.stringify(values)
      );
    } catch {
      setStatus("collection changes could not be saved");
    }
  };

  const toggleOwned = (cardId: string) => {
    const next = owned.includes(cardId)
      ? owned.filter((id) => id !== cardId)
      : [...owned, cardId];

    saveList("cmc-carddex-owned", next, setOwned);
  };

  const toggleWanted = (cardId: string) => {
    const next = wanted.includes(cardId)
      ? wanted.filter((id) => id !== cardId)
      : [...wanted, cardId];

    saveList("cmc-carddex-wanted", next, setWanted);
  };

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize)),
    [totalCount, pageSize]
  );

  return (
    <main>
      <header className="header">
        <div>
          <p className="eyebrow">
            CONSCIOUS MIND CONCEPTS
          </p>
          <h1>CMC CardDex</h1>
          <p className="tagline">
            search the Pokémon card catalogue, build your
            collection, and track your wanted cards.
          </p>
        </div>

        <span className="status">
          {loading ? "loading" : status}
        </span>
      </header>

      <section className="summary">
        <div className="stat">
          <strong>{totalCount.toLocaleString()}</strong>
          <span>matching cards</span>
        </div>
        <div className="stat">
          <strong>{sets.length.toLocaleString()}</strong>
          <span>sets loaded</span>
        </div>
        <div className="stat">
          <strong>{owned.length.toLocaleString()}</strong>
          <span>owned</span>
        </div>
        <div className="stat">
          <strong>{wanted.length.toLocaleString()}</strong>
          <span>wanted</span>
        </div>
      </section>

      <section className="controls">
        <input
          className="search"
          type="search"
          value={search}
          placeholder="search Pokémon cards"
          aria-label="search Pokémon cards"
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />

        <select
          className="select"
          value={selectedSet}
          aria-label="filter by set"
          onChange={(event) => {
            setSelectedSet(event.target.value);
            setPage(1);
          }}
        >
          <option value="">all sets</option>
          {sets.map((set) => (
            <option key={set.id} value={set.id}>
              {set.name}
            </option>
          ))}
        </select>
      </section>

      <section className="grid">
        {!loading && cards.length === 0 && (
          <div className="message">
            no verified cards matched this search.
          </div>
        )}

        {cards.map((card) => {
          const isOwned = owned.includes(card.id);
          const isWanted = wanted.includes(card.id);

          return (
            <article className="card" key={card.id}>
              <div className="card-image">
                <img
                  src={card.images.small}
                  alt={`${card.name} Pokémon card`}
                  loading="lazy"
                />
              </div>

              <div className="card-body">
                <p className="card-set">
                  {card.set.name.toUpperCase()}
                </p>

                <h2 className="card-name">{card.name}</h2>

                <div className="card-meta">
                  <span>#{card.number}</span>
                  <span>{card.rarity || "rarity unknown"}</span>
                </div>

                <div className="card-actions">
                  <button
                    className={
                      isOwned ? "action active" : "action"
                    }
                    type="button"
                    onClick={() => toggleOwned(card.id)}
                  >
                    {isOwned ? "owned ✓" : "add to collection"}
                  </button>

                  <button
                    className={
                      isWanted ? "action active" : "action"
                    }
                    type="button"
                    onClick={() => toggleWanted(card.id)}
                  >
                    {isWanted ? "wanted ✓" : "add to want list"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <nav className="pagination" aria-label="pagination">
        <button
          className="page-button"
          type="button"
          disabled={page <= 1 || loading}
          onClick={() =>
            setPage((current) => Math.max(1, current - 1))
          }
        >
          previous
        </button>

        <span className="page-number">
          page {page} of {totalPages}
        </span>

        <button
          className="page-button"
          type="button"
          disabled={page >= totalPages || loading}
          onClick={() =>
            setPage((current) =>
              Math.min(totalPages, current + 1)
            )
          }
        >
          next
        </button>
      </nav>

      <p className="footer-note">
        catalogue metadata comes from the Pokémon TCG API.
        collection and want-list data currently stays in this
        browser. no market prices are shown until a verified
        pricing feed is connected.
      </p>
    </main>
  );
}
