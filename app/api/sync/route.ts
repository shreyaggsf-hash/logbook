import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const base = new URL(req.url).origin;

  const [storygraphResult, spotifyResult] = await Promise.allSettled([
    fetch(`${base}/api/sync/storygraph`, { method: "POST" }).then((r) => r.json()),
    fetch(`${base}/api/sync/spotify`, { method: "POST" }).then((r) => r.json()),
  ]);

  return NextResponse.json({
    storygraph:
      storygraphResult.status === "fulfilled" ? storygraphResult.value : { error: "Sync failed" },
    spotify:
      spotifyResult.status === "fulfilled" ? spotifyResult.value : { error: "Sync failed" },
  });
}
