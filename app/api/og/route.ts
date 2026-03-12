import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; logbook/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return NextResponse.json({ error: "fetch failed" }, { status: 502 });

    const html = await res.text();

    const get = (property: string) => {
      const m = html.match(
        new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i")
      ) ?? html.match(
        new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i")
      );
      return m?.[1] ?? null;
    };

    return NextResponse.json({
      image: get("og:image"),
      title: get("og:title"),
    });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
