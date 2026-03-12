import { NextResponse } from "next/server";
import { getAllEntries, createEntry } from "@/lib/notion";

interface StoryGraphBook {
  title: string;
  book_id: string;
  author: string;
  rating: number | null;
}

function parseStorygraphBooks(html: string): StoryGraphBook[] {
  const books: StoryGraphBook[] = [];
  const seen = new Set<string>();

  // Each book block starts with div.book-title-author-and-series.
  // We capture from that class marker to the next occurrence of it (or end of string)
  // to get the full per-book HTML block, then extract title and rating from it.
  const blockRegex =
    /class="[^"]*book-title-author-and-series[^"]*"([\s\S]*?)(?=class="[^"]*book-title-author-and-series|$)/g;

  let match;
  while ((match = blockRegex.exec(html)) !== null) {
    const block = match[1];

    // Title + book_id from the first /books/ link
    const linkMatch = block.match(/<a[^>]+href="\/books\/([^"?#\s]+)"[^>]*>([^<]+)<\/a>/);
    if (!linkMatch) continue;

    const book_id = linkMatch[1].trim();
    const title = linkMatch[2].trim();
    if (!book_id || !title || seen.has(book_id)) continue;
    seen.add(book_id);

    // Rating: try aria-label="X out of 5 stars" pattern first
    let rating: number | null = null;
    const ariaMatch = block.match(/aria-label="([\d.]+)\s+out\s+of\s+5\s+stars"/i);
    if (ariaMatch) {
      const val = parseFloat(ariaMatch[1]);
      if (!isNaN(val) && val >= 0 && val <= 5) rating = val;
    }

    // Fallback: look for a standalone decimal/integer rating value near a "star" context
    if (rating === null) {
      const ratingMatch = block.match(/["'\s>](5|4\.75|4\.5|4\.25|4|3\.75|3\.5|3\.25|3|2\.75|2\.5|2\.25|2|1\.75|1\.5|1\.25|1|0\.5)["'\s<]/);
      if (ratingMatch) {
        const val = parseFloat(ratingMatch[1]);
        if (!isNaN(val)) rating = val;
      }
    }

    // Author from the first /authors/ link in the block
    const authorMatch = block.match(/<a[^>]+href="\/authors\/[^"]*"[^>]*>([^<]+)<\/a>/);
    const author = authorMatch ? authorMatch[1].trim() : "";

    books.push({ title, book_id, author, rating });
  }

  return books;
}

async function getCoverFromOpenLibrary(
  title: string,
  author: string
): Promise<string | null> {
  try {
    const params = new URLSearchParams({ title, limit: "1", fields: "cover_i" });
    if (author) params.set("author", author);
    const res = await fetch(
      `https://openlibrary.org/search.json?${params}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const coverId = data.docs?.[0]?.cover_i;
    return coverId ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg` : null;
  } catch {
    return null;
  }
}

export async function POST() {
  const username = process.env.STORYGRAPH_USERNAME;
  const cookie = process.env.STORYGRAPH_COOKIE;

  if (!username || !cookie) {
    return NextResponse.json(
      { error: "Set STORYGRAPH_USERNAME and STORYGRAPH_COOKIE in your environment variables" },
      { status: 500 }
    );
  }

  let html: string;
  try {
    const res = await fetch(`https://app.thestorygraph.com/books-read/${username}`, {
      headers: {
        Cookie: `remember_user_token=${cookie}`,
        "User-Agent": "Mozilla/5.0 (compatible; logbook-sync/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Storygraph returned HTTP ${res.status}` },
        { status: 502 }
      );
    }
    html = await res.text();
  } catch {
    return NextResponse.json({ error: "Failed to reach Storygraph" }, { status: 502 });
  }

  const books = parseStorygraphBooks(html);
  if (books.length === 0) {
    return NextResponse.json(
      { error: "No books found — cookie may be expired or the page structure changed" },
      { status: 400 }
    );
  }

  const existing = await getAllEntries();
  const existingTitles = new Set(
    existing.filter((e) => e.category === "Book").map((e) => e.title.toLowerCase().trim())
  );

  const created: string[] = [];
  const skipped: string[] = [];

  for (const book of books) {
    if (existingTitles.has(book.title.toLowerCase().trim())) {
      skipped.push(book.title);
      continue;
    }

    const image = await getCoverFromOpenLibrary(book.title, book.author);
    const today = new Date().toISOString().slice(0, 10);

    await createEntry({
      title: book.title,
      category: "Book",
      date: today,
      rating: book.rating,
      notes: "",
      creator: book.author,
      tags: [],
      image,
    });

    created.push(book.title);
    existingTitles.add(book.title.toLowerCase().trim());
  }

  return NextResponse.json({ created, skipped });
}
