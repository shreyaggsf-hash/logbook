#!/usr/bin/env bash
set -e

echo "========================================="
echo "  Culture Logbook – Mac Setup Script"
echo "========================================="

# ── 1. Scaffold Next.js app ───────────────────────────────────────────────────
echo ""
echo "→ Creating Next.js app..."
npx create-next-app@latest culture-logbook \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --yes

cd culture-logbook

# ── 2. Install extra dependencies ─────────────────────────────────────────────
echo ""
echo "→ Installing dependencies..."
npm install @notionhq/client@2 recharts lucide-react

# ── 3. Create directories ─────────────────────────────────────────────────────
echo ""
echo "→ Creating project directories..."
mkdir -p types
mkdir -p lib
mkdir -p components
mkdir -p app/api/entries/\[id\]
mkdir -p app/stats

# ── 4. Write source files ─────────────────────────────────────────────────────
echo ""
echo "→ Writing source files..."

# types/index.ts
cat > types/index.ts << 'ENDOFFILE'
export type Category =
  | "Book"
  | "Movie"
  | "TV Show"
  | "Podcast"
  | "Exhibit"
  | "Event"
  | "Album"
  | "Other";

export type Status = "Completed" | "In Progress" | "Abandoned" | "Want to";

export interface Entry {
  id: string;
  title: string;
  category: Category;
  status: Status;
  date: string | null; // ISO date string
  rating: number | null; // 1–5
  notes: string;
  creator: string; // author / director / artist / etc.
  tags: string[];
}

export interface EntryFormData {
  title: string;
  category: Category;
  status: Status;
  date: string;
  rating: number | null;
  notes: string;
  creator: string;
  tags: string;
}

export interface Stats {
  total: number;
  byCategory: Record<string, number>;
  byMonth: { month: string; count: number }[];
  byRating: { rating: number; count: number }[];
  averageRating: number | null;
  topRated: Entry[];
}
ENDOFFILE

# lib/notion.ts
cat > lib/notion.ts << 'ENDOFFILE'
import { Client } from "@notionhq/client";
import type {
  PageObjectResponse,
  CreatePageParameters,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import type { Entry, Category, Status } from "@/types";

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

function pageToEntry(page: PageObjectResponse): Entry {
  return {
    id: page.id,
    title: getTitle(page),
    category: getSelect(page, "Category") as Category,
    status: getSelect(page, "Status") as Status,
    date: getDate(page, "Date"),
    rating: getNumber(page, "Rating"),
    notes: getRichText(page, "Notes"),
    creator: getRichText(page, "Creator"),
    tags: getMultiSelect(page, "Tags"),
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
  status: Status;
  date: string | null;
  rating: number | null;
  notes: string;
  creator: string;
  tags: string[];
}): Promise<Entry> {
  const properties: CreatePageParameters["properties"] = {
    Name: { title: [{ text: { content: data.title } }] },
    Category: { select: { name: data.category } },
    Status: { select: { name: data.status } },
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

  const page = await notion.pages.create({
    parent: { database_id: DATABASE_ID },
    properties,
  });

  return pageToEntry(page as PageObjectResponse);
}

export async function updateEntry(
  id: string,
  data: Partial<{
    title: string;
    category: Category;
    status: Status;
    date: string | null;
    rating: number | null;
    notes: string;
    creator: string;
    tags: string[];
  }>
): Promise<Entry> {
  const properties: UpdatePageParameters["properties"] = {};

  if (data.title !== undefined)
    properties["Name"] = { title: [{ text: { content: data.title } }] };
  if (data.category !== undefined)
    properties["Category"] = { select: { name: data.category } };
  if (data.status !== undefined)
    properties["Status"] = { select: { name: data.status } };
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

  const page = await notion.pages.update({ page_id: id, properties });
  return pageToEntry(page as PageObjectResponse);
}

export async function deleteEntry(id: string): Promise<void> {
  await notion.pages.update({ page_id: id, archived: true });
}
ENDOFFILE

# components/EntryForm.tsx
cat > components/EntryForm.tsx << 'ENDOFFILE'
"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import type { Entry, Category, Status } from "@/types";

const CATEGORIES: Category[] = [
  "Book",
  "Movie",
  "TV Show",
  "Podcast",
  "Exhibit",
  "Event",
  "Album",
  "Other",
];

const STATUSES: Status[] = ["Completed", "In Progress", "Abandoned", "Want to"];

interface Props {
  entry?: Entry | null;
  onSave: (entry: Entry) => void;
  onClose: () => void;
}

export default function EntryForm({ entry, onSave, onClose }: Props) {
  const isEditing = !!entry;

  const [form, setForm] = useState({
    title: "",
    category: "Book" as Category,
    status: "Completed" as Status,
    date: new Date().toISOString().slice(0, 10),
    rating: "" as string,
    notes: "",
    creator: "",
    tags: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (entry) {
      setForm({
        title: entry.title,
        category: entry.category,
        status: entry.status,
        date: entry.date ?? "",
        rating: entry.rating?.toString() ?? "",
        notes: entry.notes,
        creator: entry.creator,
        tags: entry.tags.join(", "),
      });
    }
  }, [entry]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    setError("");

    const payload = {
      title: form.title.trim(),
      category: form.category,
      status: form.status,
      date: form.date || null,
      rating: form.rating ? Number(form.rating) : null,
      notes: form.notes.trim(),
      creator: form.creator.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch(
        isEditing ? `/api/entries/${entry!.id}` : "/api/entries",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Save failed");
      const saved: Entry = await res.json();
      onSave(saved);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? "Edit entry" : "Add entry"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. The Bear, Normal People, Dune..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Creator */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Creator{" "}
              <span className="text-gray-400 font-normal">
                (author / director / artist)
              </span>
            </label>
            <input
              type="text"
              value={form.creator}
              onChange={(e) => set("creator", e.target.value)}
              placeholder="e.g. Christopher Nolan"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Date + Rating */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date consumed
              </label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating (1–5)
              </label>
              <select
                value={form.rating}
                onChange={(e) => set("rating", e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">No rating</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {"★".repeat(n)} ({n})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags{" "}
              <span className="text-gray-400 font-normal">
                (comma-separated)
              </span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="e.g. sci-fi, thriller, 2024"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Thoughts, quotes, recommendations..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : isEditing ? "Save changes" : "Add entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
ENDOFFILE

# components/EntryCard.tsx
cat > components/EntryCard.tsx << 'ENDOFFILE'
"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { Entry } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  Book: "bg-amber-100 text-amber-800",
  Movie: "bg-blue-100 text-blue-800",
  "TV Show": "bg-purple-100 text-purple-800",
  Podcast: "bg-green-100 text-green-800",
  Exhibit: "bg-pink-100 text-pink-800",
  Event: "bg-orange-100 text-orange-800",
  Album: "bg-cyan-100 text-cyan-800",
  Other: "bg-gray-100 text-gray-700",
};

const STATUS_DOT: Record<string, string> = {
  Completed: "bg-green-400",
  "In Progress": "bg-yellow-400",
  Abandoned: "bg-red-400",
  "Want to": "bg-gray-300",
};

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  return (
    <span className="text-amber-400 text-sm tracking-tight">
      {"★".repeat(rating)}
      <span className="text-gray-200">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

interface Props {
  entry: Entry;
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
}

export default function EntryCard({ entry, onEdit, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const categoryColor =
    CATEGORY_COLORS[entry.category] ?? "bg-gray-100 text-gray-700";
  const statusDot = STATUS_DOT[entry.status] ?? "bg-gray-300";

  const formattedDate = entry.date
    ? new Date(entry.date + "T00:00:00").toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <div className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor}`}
            >
              {entry.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
              {entry.status}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{entry.title}</h3>
          {entry.creator && (
            <p className="text-sm text-gray-500 truncate">{entry.creator}</p>
          )}
        </div>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDelete(entry.id)}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <Stars rating={entry.rating} />
        {formattedDate && (
          <span className="text-xs text-gray-400">{formattedDate}</span>
        )}
      </div>

      {entry.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {entry.notes && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">{entry.notes}</p>
      )}
    </div>
  );
}
ENDOFFILE

# components/FilterBar.tsx
cat > components/FilterBar.tsx << 'ENDOFFILE'
"use client";

import { Search, X } from "lucide-react";
import type { Category, Status } from "@/types";

const CATEGORIES: Category[] = [
  "Book",
  "Movie",
  "TV Show",
  "Podcast",
  "Exhibit",
  "Event",
  "Album",
  "Other",
];

const STATUSES: Status[] = ["Completed", "In Progress", "Abandoned", "Want to"];

export interface Filters {
  search: string;
  category: Category | "";
  status: Status | "";
  year: string;
  rating: string;
  sort: "date-desc" | "date-asc" | "rating-desc" | "title-asc";
}

interface Props {
  filters: Filters;
  availableYears: string[];
  onChange: (filters: Filters) => void;
}

export default function FilterBar({ filters, availableYears, onChange }: Props) {
  function set(field: keyof Filters, value: string) {
    onChange({ ...filters, [field]: value });
  }

  const hasActiveFilters =
    filters.search ||
    filters.category ||
    filters.status ||
    filters.year ||
    filters.rating;

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          placeholder="Search titles, creators, notes..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
        {filters.search && (
          <button
            onClick={() => set("search", "")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={filters.category}
          onChange={(e) => set("category", e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => set("status", e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>

        {availableYears.length > 0 && (
          <select
            value={filters.year}
            onChange={(e) => set("year", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">All years</option>
            {availableYears.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        )}

        <select
          value={filters.rating}
          onChange={(e) => set("rating", e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          <option value="">Any rating</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)} & up
            </option>
          ))}
        </select>

        <div className="ml-auto">
          <select
            value={filters.sort}
            onChange={(e) =>
              set("sort", e.target.value)
            }
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="date-desc">Newest first</option>
            <option value="date-asc">Oldest first</option>
            <option value="rating-desc">Highest rated</option>
            <option value="title-asc">A–Z</option>
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={() =>
              onChange({
                search: "",
                category: "",
                status: "",
                year: "",
                rating: "",
                sort: filters.sort,
              })
            }
            className="text-xs text-indigo-600 hover:text-indigo-800 underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
ENDOFFILE

# components/StatsView.tsx
cat > components/StatsView.tsx << 'ENDOFFILE'
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { Entry } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  Book: "#f59e0b",
  Movie: "#3b82f6",
  "TV Show": "#8b5cf6",
  Podcast: "#10b981",
  Exhibit: "#ec4899",
  Event: "#f97316",
  Album: "#06b6d4",
  Other: "#6b7280",
};

const PIE_COLORS = [
  "#6366f1", "#f59e0b", "#3b82f6", "#10b981",
  "#ec4899", "#f97316", "#8b5cf6", "#06b6d4",
];

interface Props {
  entries: Entry[];
  year: string;
}

export default function StatsView({ entries, year }: Props) {
  const filtered = year
    ? entries.filter((e) => e.date?.startsWith(year))
    : entries;

  const completed = filtered.filter((e) => e.status === "Completed");

  // By category
  const byCategoryMap: Record<string, number> = {};
  for (const e of filtered) {
    byCategoryMap[e.category] = (byCategoryMap[e.category] ?? 0) + 1;
  }
  const byCategory = Object.entries(byCategoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // By month
  const byMonthMap: Record<string, number> = {};
  for (const e of filtered) {
    if (!e.date) continue;
    const month = e.date.slice(0, 7); // YYYY-MM
    byMonthMap[month] = (byMonthMap[month] ?? 0) + 1;
  }
  const byMonth = Object.entries(byMonthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
      }),
      count,
    }));

  // Average rating
  const rated = completed.filter((e) => e.rating !== null);
  const avgRating =
    rated.length > 0
      ? (rated.reduce((s, e) => s + e.rating!, 0) / rated.length).toFixed(1)
      : null;

  // Top rated
  const topRated = [...completed]
    .filter((e) => e.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        No entries{year ? ` for ${year}` : ""} yet.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total logged" value={filtered.length} />
        <StatCard label="Completed" value={completed.length} />
        <StatCard
          label="Avg rating"
          value={avgRating ? `${avgRating} / 5` : "—"}
        />
        <StatCard
          label="Categories"
          value={Object.keys(byCategoryMap).length}
        />
      </div>

      {/* By category */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          By category
        </h3>
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <div className="w-full sm:w-72 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {byCategory.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={
                        CATEGORY_COLORS[entry.name] ??
                        PIE_COLORS[i % PIE_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 w-full">
            {byCategory.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    background:
                      CATEGORY_COLORS[c.name] ?? PIE_COLORS[0],
                  }}
                />
                <span className="text-sm text-gray-700 flex-1">{c.name}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 rounded-full bg-indigo-200"
                    style={{
                      width: `${Math.round(
                        (c.value / filtered.length) * 120
                      )}px`,
                    }}
                  />
                  <span className="text-sm font-medium text-gray-900 w-5 text-right">
                    {c.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* By month */}
      {byMonth.length > 1 && (
        <section>
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Timeline
          </h3>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={byMonth} barSize={24}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Top rated */}
      {topRated.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Top rated
          </h3>
          <ol className="space-y-2">
            {topRated.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-400 w-5">
                  {i + 1}.
                </span>
                <span className="text-sm flex-1 text-gray-900">{e.title}</span>
                <span className="text-xs text-gray-400">{e.category}</span>
                <span className="text-amber-400 text-sm">
                  {"★".repeat(e.rating ?? 0)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
      <div className="text-2xl font-bold text-indigo-600">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
ENDOFFILE

# app/layout.tsx
cat > app/layout.tsx << 'ENDOFFILE'
import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { BookOpen, BarChart2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Culture Logbook",
  description: "Track the books, films, shows, podcasts and events you consume.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen font-sans antialiased">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
              <BookOpen size={20} className="text-indigo-600" />
              Culture Logbook
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <BookOpen size={15} />
                Logbook
              </Link>
              <Link
                href="/stats"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <BarChart2 size={15} />
                Stats
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
ENDOFFILE

# app/page.tsx
cat > app/page.tsx << 'ENDOFFILE'
"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import EntryCard from "@/components/EntryCard";
import EntryForm from "@/components/EntryForm";
import FilterBar, { Filters } from "@/components/FilterBar";
import type { Entry } from "@/types";

const DEFAULT_FILTERS: Filters = {
  search: "",
  category: "",
  status: "",
  year: "",
  rating: "",
  sort: "date-desc",
};

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);

  async function fetchEntries() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/entries");
      if (!res.ok) throw new Error("Failed to load");
      const data: Entry[] = await res.json();
      setEntries(data);
    } catch {
      setError("Could not load entries. Check your Notion credentials.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEntries();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const e of entries) {
      if (e.date) years.add(e.date.slice(0, 4));
    }
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [entries]);

  const filtered = useMemo(() => {
    let result = [...entries];
    const q = filters.search.toLowerCase();

    if (q) {
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.creator.toLowerCase().includes(q) ||
          e.notes.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (filters.category) {
      result = result.filter((e) => e.category === filters.category);
    }
    if (filters.status) {
      result = result.filter((e) => e.status === filters.status);
    }
    if (filters.year) {
      result = result.filter((e) => e.date?.startsWith(filters.year));
    }
    if (filters.rating) {
      const min = Number(filters.rating);
      result = result.filter((e) => (e.rating ?? 0) >= min);
    }

    switch (filters.sort) {
      case "date-asc":
        result.sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
        break;
      case "date-desc":
        result.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
        break;
      case "rating-desc":
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "title-asc":
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [entries, filters]);

  function handleSave(saved: Entry) {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === saved.id);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = saved;
        return next;
      }
      return [saved, ...prev];
    });
    setShowForm(false);
    setEditEntry(null);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch {
      alert("Failed to delete entry.");
    }
  }

  function openEdit(entry: Entry) {
    setEditEntry(entry);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditEntry(null);
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Logbook</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {entries.length} {entries.length === 1 ? "entry" : "entries"} total
            </p>
          )}
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Add entry
        </button>
      </div>

      <div className="mb-6">
        <FilterBar
          filters={filters}
          availableYears={availableYears}
          onChange={setFilters}
        />
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 p-4 h-36 animate-pulse"
            >
              <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-medium">{error}</p>
          <button
            onClick={fetchEntries}
            className="mt-3 text-sm text-red-600 underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-400 text-lg mb-2">
            {entries.length === 0
              ? "Your logbook is empty — start adding entries!"
              : "No entries match your filters."}
          </p>
          {entries.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 px-5 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Add your first entry
            </button>
          )}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-3">
            Showing {filtered.length} of {entries.length}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </>
      )}

      {showForm && (
        <EntryForm
          entry={editEntry}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </>
  );
}
ENDOFFILE

# app/globals.css
cat > app/globals.css << 'ENDOFFILE'
@import "tailwindcss";

* {
  box-sizing: border-box;
}
ENDOFFILE

# app/api/entries/route.ts
cat > app/api/entries/route.ts << 'ENDOFFILE'
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
ENDOFFILE

# app/api/entries/[id]/route.ts
cat > "app/api/entries/[id]/route.ts" << 'ENDOFFILE'
import { NextRequest, NextResponse } from "next/server";
import { updateEntry, deleteEntry } from "@/lib/notion";
import type { Category, Status } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, category, status, date, rating, notes, creator, tags } = body;

    const entry = await updateEntry(id, {
      ...(title !== undefined && { title }),
      ...(category !== undefined && { category: category as Category }),
      ...(status !== undefined && { status: status as Status }),
      ...(date !== undefined && { date }),
      ...(rating !== undefined && { rating }),
      ...(notes !== undefined && { notes }),
      ...(creator !== undefined && { creator }),
      ...(tags !== undefined && { tags }),
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
ENDOFFILE

# app/stats/page.tsx
cat > app/stats/page.tsx << 'ENDOFFILE'
"use client";

import { useEffect, useMemo, useState } from "react";
import StatsView from "@/components/StatsView";
import type { Entry } from "@/types";

export default function StatsPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  useEffect(() => {
    fetch("/api/entries")
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data: Entry[]) => {
        setEntries(data);
        // Default to current year if data exists for it
        const currentYear = new Date().getFullYear().toString();
        const hasCurrentYear = data.some((e) => e.date?.startsWith(currentYear));
        setSelectedYear(hasCurrentYear ? currentYear : "");
      })
      .catch(() => setError("Could not load entries."))
      .finally(() => setLoading(false));
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const e of entries) {
      if (e.date) years.add(e.date.slice(0, 4));
    }
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [entries]);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stats</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your culture at a glance</p>
        </div>
        {availableYears.length > 0 && (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All time</option>
            {availableYears.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        )}
      </div>

      {loading && (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 h-24" />
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 h-64" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <StatsView entries={entries} year={selectedYear} />
      )}
    </>
  );
}
ENDOFFILE

# ── 5. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo "  Setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "  1. Create a .env.local file in the culture-logbook directory:"
echo "       NOTION_TOKEN=your_notion_integration_token"
echo "       NOTION_DATABASE_ID=your_notion_database_id"
echo ""
echo "  2. Start the dev server:"
echo "       npm run dev"
echo ""
echo "  3. Open http://localhost:3000 in your browser."
echo ""
