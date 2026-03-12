import { NextResponse } from "next/server";
import { getAllEntries, createEntry } from "@/lib/notion";

interface StoryGraphBook {
  title: string;
  book_id: string;
}

function parseStorygraphBooks(html: string): StoryGraphBook[] {
  const books: StoryGraphBook[] = [];
  const seen = new Set<string>();

  // Find all anchor tags inside div.book-title-author-and-series
  // Structure: <div class="book-title-author-and-series"><p><a href="/books/SLUG">Title</a>
  const bookDivRegex = /class="[^"]*book-title-author-and-series[^"]*"[\s\S]*?<a\s[^>]*href="\/books\/([^"?#\s]+)"[^>]*>([^<]+)<\/a>/g;

  let match;
  while ((match = bookDivRegex.exec(html)) !== null) {
    const book_id = match[1].trim();
    const title = match[2].trim();
    if (book_id && title && !seen.has(book_id)) {
      seen.add(book_id);
      books.push({ title, book_id });
    }
  }

  return books;
}

async function enrichFromOpenLibrary(
  title: string
): Promise<{ author: string; image: string | null }> {
  try {
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(title)}&limit=1&fields=author_name,cover_i`,
      { cache: "no-store" }
    );
    if (!res.ok) return { author: "", image: null };
    const data = await res.json();
    const doc = data.docs?.[0];
    const author = doc?.author_name?.[0] ?? "";
    const image = doc?.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : null;
    return { author, image };
  } catch {
    return { author: "", image: null };
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
        Cookie: `_storygraph_session=${cookie}`,
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

    const { author, image } = await enrichFromOpenLibrary(book.title);

    await createEntry({
      title: book.title,
      category: "Book",
      date: null,
      rating: null,
      notes: "",
      creator: author,
      tags: [],
      image,
    });

    created.push(book.title);
    existingTitles.add(book.title.toLowerCase().trim());
  }

  return NextResponse.json({ created, skipped });
}
