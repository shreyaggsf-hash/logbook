"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X, BookOpen, Film, Tv, Mic, Landmark, Calendar } from "lucide-react";
import EntryCard from "@/components/EntryCard";
import EntryForm from "@/components/EntryForm";
import FilterBar, { Filters } from "@/components/FilterBar";
import type { Entry, Category } from "@/types";

const DIAL_CATEGORIES: { name: Category; icon: React.ElementType }[] = [
  { name: "Book", icon: BookOpen },
  { name: "Movie", icon: Film },
  { name: "TV Show", icon: Tv },
  { name: "Podcast", icon: Mic },
  { name: "Exhibit", icon: Landmark },
  { name: "Event", icon: Calendar },
];

const DEFAULT_FILTERS: Filters = {
  search: "",
  category: "",
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDial, setShowDial] = useState(false);

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
    setSelectedCategory(null);
  }

  function openWithCategory(cat: string) {
    setSelectedCategory(cat);
    setShowDial(false);
    setShowForm(true);
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Logbook</h1>
        {!loading && (
          <p className="text-sm text-gray-500 mt-0.5">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} total
          </p>
        )}
      </div>

      <div className="mb-6">
        <FilterBar
          filters={filters}
          availableYears={availableYears}
          onChange={setFilters}
        />
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
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
          <div className="flex flex-col gap-3">
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

      {/* Speed dial backdrop */}
      {showDial && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowDial(false)}
        />
      )}

      {/* Speed dial category list */}
      {showDial && (
        <div className="fixed bottom-24 left-0 right-0 z-50 px-4 animate-slide-up">
          <div className="grid grid-cols-2 gap-2">
            {DIAL_CATEGORIES.map(({ name, icon: Icon }) => (
              <button
                key={name}
                onClick={() => openWithCategory(name)}
                className="flex items-center gap-3 px-4 py-3 bg-white text-gray-800 font-medium text-sm rounded-xl shadow-md active:scale-95 transition-transform"
              >
                <span className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-white" />
                </span>
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* FAB — centered in bottom nav */}
      <button
        onClick={() => setShowDial((d) => !d)}
        className="fixed bottom-3 left-1/2 -translate-x-1/2 w-16 h-16 bg-white border-4 border-indigo-600 text-indigo-600 rounded-full shadow-xl flex items-center justify-center active:scale-95 transition-transform z-50"
        aria-label="Add entry"
      >
        {showDial ? <X size={30} strokeWidth={2.5} /> : <Plus size={30} strokeWidth={2.5} />}
      </button>

      {showForm && (
        <EntryForm
          entry={editEntry}
          initialCategory={selectedCategory as Category ?? undefined}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </>
  );
}
