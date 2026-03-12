import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  CreatePageParameters,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import type { Entry, Category } from "@/types";

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID!;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRichText(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop];
  if (p?.type === "rich_text") {
    return p.rich_text.map((t) => t.plain_text).join("") ?? "";
  }
  return "";
}

function getTitle(page: PageObjectResponse): string {
  const p = page.properties["Name"];
  if (p?.type === "title") {
    return p.title.map((t) => t.plain_text).join("");
  }
  return "";
}

function getSelect(page: PageObjectResponse, prop: string): string {
  const p = page.properties[prop];
  if (p?.type === "select") return p.select?.name ?? "";
  return "";
}

function getMultiSelect(page: PageObjectResponse, prop: string): string[] {
  const p = page.properties[prop];
  if (p?.type === "multi_select") return p.multi_select.map((s) => s.name);
  return [];
}

function getDate(page: PageObjectResponse, prop: string): string | null {
  const p = page.properties[prop];
  if (p?.type === "date") return p.date?.start ?? null;
  return null;
}

function getNumber(page: PageObjectResponse, prop: string): number | null {
  const p = page.properties[prop];
  if (p?.type === "number") return p.number;
  return null;
}

function getCoverImage(page: PageObjectResponse): string | null {
  if (!page.cover) return null;
  if (page.cover.type === "external") return page.cover.external.url;
  if (page.cover.type === "file") return page.cover.file.url;
  return null;
}

function pageToEntry(page: PageObjectResponse): Entry {
  return {
    id: page.id,
    title: getTitle(page),
    category: getSelect(page, "Category") as Category,
    date: getDate(page, "Date"),
    rating: getNumber(page, "Rating"),
    notes: getRichText(page, "Notes"),
    creator: getRichText(page, "Creator"),
    tags: getMultiSelect(page, "Tags"),
    image: getCoverImage(page),
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function getAllEntries(): Promise<Entry[]> {
  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      sorts: [{ property: "Date", direction: "descending" }],
      start_cursor: cursor,
      page_size: 100,
    });
    for (const page of response.results) {
      if (page.object === "page") {
        pages.push(page as PageObjectResponse);
      }
    }
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return pages.map(pageToEntry);
}

export async function createEntry(data: {
  title: string;
  category: Category;
  date: string | null;
  rating: number | null;
  notes: string;
  creator: string;
  tags: string[];
  image?: string | null;
}): Promise<Entry> {
  const properties: CreatePageParameters["properties"] = {
    Name: { title: [{ text: { content: data.title } }] },
    Category: { select: { name: data.category } },
    Notes: { rich_text: [{ text: { content: data.notes } }] },
    Creator: { rich_text: [{ text: { content: data.creator } }] },
    Tags: { multi_select: data.tags.map((t) => ({ name: t.trim() })) },
  };

  if (data.date) {
    properties["Date"] = { date: { start: data.date } };
  }
  if (data.rating !== null) {
    properties["Rating"] = { number: data.rating };
  }

  const createParams: CreatePageParameters = {
    parent: { database_id: DATABASE_ID },
    properties,
  };
  if (data.image) {
    createParams.cover = { type: "external", external: { url: data.image } };
  }

  const page = await notion.pages.create(createParams);

  return pageToEntry(page as PageObjectResponse);
}

export async function updateEntry(
  id: string,
  data: Partial<{
    title: string;
    category: Category;
    date: string | null;
    rating: number | null;
    notes: string;
    creator: string;
    tags: string[];
    image: string | null;
  }>
): Promise<Entry> {
  const properties: UpdatePageParameters["properties"] = {};

  if (data.title !== undefined)
    properties["Name"] = { title: [{ text: { content: data.title } }] };
  if (data.category !== undefined)
    properties["Category"] = { select: { name: data.category } };
  if (data.notes !== undefined)
    properties["Notes"] = {
      rich_text: [{ text: { content: data.notes } }],
    };
  if (data.creator !== undefined)
    properties["Creator"] = {
      rich_text: [{ text: { content: data.creator } }],
    };
  if (data.tags !== undefined)
    properties["Tags"] = {
      multi_select: data.tags.map((t) => ({ name: t.trim() })),
    };
  if (data.date !== undefined)
    properties["Date"] = data.date ? { date: { start: data.date } } : { date: null };
  if (data.rating !== undefined)
    properties["Rating"] = { number: data.rating };

  const updateParams: UpdatePageParameters = { page_id: id, properties };
  if (data.image !== undefined) {
    updateParams.cover = data.image
      ? { type: "external", external: { url: data.image } }
      : null;
  }

  const page = await notion.pages.update(updateParams);
  return pageToEntry(page as PageObjectResponse);
}

export async function deleteEntry(id: string): Promise<void> {
  await notion.pages.update({ page_id: id, archived: true });
}
