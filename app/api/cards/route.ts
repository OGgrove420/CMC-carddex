import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = "https://api.pokemontcg.io/v2";

function clean(value: string | null) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9 .:'’&()\-]/g, "")
    .slice(0, 80);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = clean(url.searchParams.get("search"));
    const set = clean(url.searchParams.get("set"));
    const page = Math.max(
      1,
      Number.parseInt(
        url.searchParams.get("page") || "1",
        10
      ) || 1
    );

    const pageSize = 24;
    const queries: string[] = [];

    if (search) {
      queries.push(`name:"*${search}*"`);
    }

    if (set) {
      queries.push(`set.id:${set}`);
    }

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      orderBy: "-set.releaseDate,name",
      select:
        "id,name,number,rarity,set,images,artist,supertype,subtypes",
    });

    if (queries.length) {
      params.set("q", queries.join(" "));
    }

    const headers: HeadersInit = {
      accept: "application/json",
    };

    if (process.env.POKEMON_TCG_API_KEY) {
      headers["X-Api-Key"] =
        process.env.POKEMON_TCG_API_KEY;
    }

    const [cardsResponse, setsResponse] =
      await Promise.all([
        fetch(`${API_URL}/cards?${params.toString()}`, {
          headers,
          next: { revalidate: 300 },
        }),
        fetch(
          `${API_URL}/sets?orderBy=-releaseDate&pageSize=250`,
          {
            headers,
            next: { revalidate: 3600 },
          }
        ),
      ]);

    if (!cardsResponse.ok || !setsResponse.ok) {
      return NextResponse.json(
        { error: "catalogue provider unavailable" },
        { status: 502 }
      );
    }

    const cardsData = await cardsResponse.json();
    const setsData = await setsResponse.json();

    return NextResponse.json(
      {
        cards: cardsData.data || [],
        page: Number(cardsData.page || page),
        pageSize: Number(
          cardsData.pageSize || pageSize
        ),
        totalCount: Number(cardsData.totalCount || 0),
        sets: (setsData.data || []).map(
          (item: { id: string; name: string }) => ({
            id: item.id,
            name: item.name,
          })
        ),
      },
      {
        headers: {
          "cache-control":
            "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("card catalogue error", error);

    return NextResponse.json(
      { error: "could not load card catalogue" },
      { status: 500 }
    );
  }
}
