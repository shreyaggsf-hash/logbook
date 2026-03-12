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
