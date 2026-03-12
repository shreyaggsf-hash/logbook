import { NextRequest, NextResponse } from "next/server";

type ItunesItem = {
  trackName?: string;
  collectionName?: string;
  artistName?: string;
  artworkUrl100?: string;
};

type TvMazeShow = {
  show: {
    name: string;
    image?: { medium?: string };
    network?: { name: string };
    webChannel?: { name: string };
  };
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const category = searchParams.get("category") ?? "";
  const episodeMode = searchParams.get("episode") === "1";
  const showName = searchParams.get("showName") ?? "";

  if (!q || q.length < 2) return NextResponse.json([]);

  try {
    if (category === "Book") {
      const res = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&limit=6&fields=title,author_name,cover_i`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const results = (
        data.docs as { title: string; author_name?: string[]; cover_i?: number }[]
      )
        .slice(0, 6)
        .map((d) => ({
          title: d.title,
          creator: d.author_name?.[0] ?? "",
          subtitle: undefined,
          image: d.cover_i
            ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`
            : null,
        }));
      return NextResponse.json(results);
    }

    if (category === "Movie") {
      const omdbKey = process.env.OMDB_API_KEY;
      if (!omdbKey) {
        console.error("[search] OMDB_API_KEY is not set");
        return NextResponse.json([]);
      }
      const res = await fetch(
        `https://www.omdbapi.com/?s=${encodeURIComponent(q)}&type=movie&apikey=${omdbKey}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      type OmdbResult = { Title: string; Year: string; Poster: string };
      if (!data.Search) return NextResponse.json([]);
      const results = (data.Search as OmdbResult[]).slice(0, 6).map((d) => ({
        title: d.Title,
        creator: "",
        subtitle: d.Year,
        image: d.Poster !== "N/A" ? d.Poster : null,
      }));
      return NextResponse.json(results);
    }

    if (category === "TV Show") {
      if (episodeMode) {
        const term = showName ? `${showName} ${q}` : q;
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=tvShow&entity=tvEpisode&limit=10`,
          { cache: "no-store" }
        );
        const data = await res.json();
        const results = (data.results as ItunesItem[])
          .filter((d) => d.trackName)
          .slice(0, 6)
          .map((d) => ({
            title: d.trackName!,
            creator: "",
            subtitle: d.collectionName ?? "",
            image: d.artworkUrl100 ? d.artworkUrl100.replace("100x100bb", "600x600bb") : null,
          }));
        return NextResponse.json(results);
      }

      const res = await fetch(
        `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`,
        { cache: "no-store" }
      );
      const data: TvMazeShow[] = await res.json();
      const results = data.slice(0, 6).map((item) => ({
        title: item.show.name,
        creator: "",
        subtitle:
          item.show.network?.name ?? item.show.webChannel?.name ?? "",
        image: item.show.image?.medium ?? null,
      }));
      return NextResponse.json(results);
    }

    if (category === "Podcast") {
      const url = episodeMode
        ? `https://itunes.apple.com/search?term=${encodeURIComponent(showName + " " + q)}&media=podcast&entity=podcastEpisode&limit=10`
        : `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=podcast&limit=6`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (episodeMode) {
        const results = (data.results as ItunesItem[])
          .filter((d) => d.trackName)
          .slice(0, 6)
          .map((d) => ({
            title: d.trackName!,
            creator: "",
            subtitle: d.collectionName ?? "",
            image: d.artworkUrl100 ? d.artworkUrl100.replace("100x100bb", "600x600bb") : null,
          }));
        return NextResponse.json(results);
      }

      const results = (data.results as ItunesItem[]).map((d) => ({
        title: d.collectionName ?? d.trackName ?? "",
        creator: d.artistName ?? "",
        subtitle: undefined,
        image: d.artworkUrl100 ? d.artworkUrl100.replace("100x100bb", "600x600bb") : null,
      }));
      return NextResponse.json(results);
    }

    if (category === "Album") {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=album&limit=6`,
        { cache: "no-store" }
      );
      const data = await res.json();
      const results = (data.results as ItunesItem[]).map((d) => ({
        title: d.collectionName ?? "",
        creator: d.artistName ?? "",
        subtitle: undefined,
        image: d.artworkUrl100 ? d.artworkUrl100.replace("100x100bb", "600x600bb") : null,
      }));
      return NextResponse.json(results);
    }
  } catch (e) {
    console.error("Search error:", e);
  }

  return NextResponse.json([]);
}
