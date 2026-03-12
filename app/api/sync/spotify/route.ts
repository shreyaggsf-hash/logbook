import { NextResponse } from "next/server";
import { getAllEntries, createEntry } from "@/lib/notion";

interface SpotifyAlbum {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string; height: number }[];
  release_date: string;
}

async function getAccessToken(): Promise<string> {
  const credentials = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN!,
    }),
  });

  if (!res.ok) {
    throw new Error(`Spotify auth failed: ${res.status}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function fetchAllSavedAlbums(
  accessToken: string
): Promise<Array<{ added_at: string; album: SpotifyAlbum }>> {
  const items: Array<{ added_at: string; album: SpotifyAlbum }> = [];
  let url: string | null = "https://api.spotify.com/v1/me/albums?limit=50";

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) break;
    const data = await res.json();
    items.push(...(data.items ?? []));
    url = data.next ?? null;
  }

  return items;
}

export async function POST() {
  if (
    !process.env.SPOTIFY_CLIENT_ID ||
    !process.env.SPOTIFY_CLIENT_SECRET ||
    !process.env.SPOTIFY_REFRESH_TOKEN
  ) {
    return NextResponse.json(
      {
        error:
          "Set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REFRESH_TOKEN in your environment variables",
      },
      { status: 500 }
    );
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken();
  } catch {
    return NextResponse.json({ error: "Failed to authenticate with Spotify" }, { status: 502 });
  }

  const savedAlbums = await fetchAllSavedAlbums(accessToken);

  const existing = await getAllEntries();
  const existingTitles = new Set(
    existing.filter((e) => e.category === "Album").map((e) => e.title.toLowerCase().trim())
  );

  const created: string[] = [];
  const skipped: string[] = [];

  for (const { added_at, album } of savedAlbums) {
    const title = album.name;
    if (existingTitles.has(title.toLowerCase().trim())) {
      skipped.push(title);
      continue;
    }

    const creator = album.artists.map((a) => a.name).join(", ");
    const image =
      album.images.sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0]?.url ?? null;
    const date = added_at.split("T")[0];

    await createEntry({
      title,
      category: "Album",
      date,
      rating: null,
      notes: "",
      creator,
      tags: [],
      image,
    });

    created.push(title);
    existingTitles.add(title.toLowerCase().trim());
  }

  return NextResponse.json({ created, skipped });
}
