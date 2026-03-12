import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const base = new URL(req.url).origin;

  const res = await fetch(`${base}/api/sync/storygraph`, { method: "POST" });
  const storygraph = await res.json();

  return NextResponse.json({ storygraph });
}
