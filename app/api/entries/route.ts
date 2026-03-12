import { NextRequest, NextResponse } from "next/server";
import { getAllEntries, createEntry } from "@/lib/notion";
import type { Category, Status } from "@/types";

export async function GET() {
  try {
    const entries = await getAllEntries();
    return NextResponse.json(entries);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, category, status, date, rating, notes, creator, tags } = body;

    if (!title || !category || !status) {
      return NextResponse.json({ error: "title, category, and status are required" }, { status: 400 });
    }

    const entry = await createEntry({
      title,
      category: category as Category,
      status: status as Status,
      date: date || null,
      rating: rating ?? null,
      notes: notes || "",
      creator: creator || "",
      tags: Array.isArray(tags) ? tags : [],
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
  }
}
