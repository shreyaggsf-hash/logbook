import { NextRequest, NextResponse } from "next/server";
import { updateEntry, deleteEntry } from "@/lib/notion";
import type { Category } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, category, date, rating, notes, creator, tags, image } = body;

    const entry = await updateEntry(id, {
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category: category as Category }),
      ...(date !== undefined && { date }),
      ...(rating !== undefined && { rating }),
      ...(notes !== undefined && { notes }),
      ...(creator !== undefined && { creator }),
      ...(tags !== undefined && { tags }),
      ...(image !== undefined && { image }),
    });

    return NextResponse.json(entry);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteEntry(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
  }
}
