import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  const userAgents = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (compatible; Twitterbot/1.0)",
    "facebookexternalhit/1.1",
  ];

  let html: string | null = null;
  for (const ua of userAgents) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": ua,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        html = await res.text();
        break;
      }
    } catch {
      // try next user agent
    }
  }

  if (!html) return NextResponse.json({ error: "fetch failed" }, { status: 502 });

  try {
    const getMeta = (attr: string, value: string) =>
      html!.match(new RegExp(`<meta[^>]+${attr}=["']${value}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1] ??
      html!.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${value}["']`, "i"))?.[1] ??
      null;

    const image =
      getMeta("property", "og:image") ??
      getMeta("name", "twitter:image") ??
      getMeta("name", "twitter:image:src") ??
      null;

    const title =
      getMeta("property", "og:title") ??
      getMeta("name", "twitter:title") ??
      null;

    return NextResponse.json({ image, title });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 502 });
  }
}
