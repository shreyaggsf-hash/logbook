"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X, BookOpen, Film, Tv, Mic, Landmark, Calendar } from "lucide-react";
import EntryForm from "@/components/EntryForm";
import type { Entry, Category } from "@/types";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const CATEGORIES: {
  name: Category;
  singular: string;
  plural: string;
  icon: React.ElementType;
  bg: string;
}[] = [
  { name: "Book",    singular: "Book",    plural: "Books",    icon: BookOpen, bg: "bg-amber-100"  },
  { name: "Movie",   singular: "Movie",   plural: "Movies",   icon: Film,     bg: "bg-blue-100"   },
  { name: "TV Show", singular: "Show",    plural: "Shows",    icon: Tv,       bg: "bg-purple-100" },
  { name: "Podcast", singular: "Podcast", plural: "Podcasts", icon: Mic,      bg: "bg-green-100"  },
  { name: "Exhibit", singular: "Exhibit", plural: "Exhibits", icon: Landmark, bg: "bg-pink-100"   },
  { name: "Event",   singular: "Event",   plural: "Events",   icon: Calendar, bg: "bg-orange-100" },
];

function EntryThumb({
  entry,
  bg,
  Icon,
  onClick,
}: {
  entry: Entry;
  bg: string;
  Icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-[72px] active:scale-95 transition-transform"
    >
      {entry.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.image}
          alt=""
          className="w-[72px] h-[100px] object-cover rounded-lg shadow-sm"
        />
      ) : (
        <div className={`w-[72px] h-[100px] rounded-lg ${bg} flex items-center justify-center shadow-sm`}>
          <Icon size={22} className="text-gray-400" />
        </div>
      )}
    </button>
  );
}

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDial, setShowDial] = useState(false);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | null>(now.getMonth() + 1);
  const yearOptions = Array.from(
    { length: now.getFullYear() - 2019 + 2 },
    (_, i) => 2020 + i
  );

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

  useEffect(() => { fetchEntries(); }, []);

  const monthEntries = useMemo(() => {
    if (month === null) return entries.filter((e) => e.date?.startsWith(`${year}`));
    const key = `${year}-${String(month).padStart(2, "0")}`;
    return entries.filter((e) => e.date?.startsWith(key));
  }, [entries, year, month]);

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
      setShowForm(false);
      setEditEntry(null);
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
      {/* Year / Month header */}
      <div className="flex items-center gap-3 mb-6">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-3xl font-bold text-indigo-600 bg-transparent border-none outline-none cursor-pointer appearance-auto"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select
          value={month ?? ""}
          onChange={(e) => setMonth(e.target.value === "" ? null : Number(e.target.value))}
          className="text-xl font-bold text-gray-900 bg-transparent border-none outline-none cursor-pointer appearance-auto"
        >
          <option value="">Full year</option>
          {MONTH_NAMES.map((name, i) => (
            <option key={i} value={i + 1}>{name}</option>
          ))}
        </select>
      </div>

      {/* Category count pills */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2 mb-6 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-gray-200 rounded-xl h-12" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {CATEGORIES.map(({ name, singular, plural }) => {
            const count = monthEntries.filter((e) => e.category === name).length;
            return (
              <button
                key={name}
                onClick={() => openWithCategory(name)}
                className="bg-indigo-600 text-white rounded-xl py-3 px-2 text-sm font-semibold text-center active:scale-95 transition-transform"
              >
                {count} {count === 1 ? singular : plural}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-6">
          <p className="text-red-700 font-medium">{error}</p>
          <button onClick={fetchEntries} className="mt-3 text-sm text-red-600 underline">
            Retry
          </button>
        </div>
      )}

      {/* Per-category sections */}
      {!loading && !error && (
        <div className="flex flex-col gap-4">
          {CATEGORIES.map(({ name, plural, icon: Icon, bg }) => {
            const catEntries = monthEntries.filter((e) => e.category === name);
            if (catEntries.length === 0) return null;
            return (
              <div key={name} className="bg-gray-100 rounded-2xl p-4">
                <h2 className="text-base font-bold text-indigo-600 mb-3">{plural}</h2>
                <div className="overflow-x-auto">
                  <div className="flex gap-3 pb-1">
                    {catEntries.map((entry) => (
                      <EntryThumb
                        key={entry.id}
                        entry={entry}
                        bg={bg}
                        Icon={Icon}
                        onClick={() => openEdit(entry)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {monthEntries.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-base">
                Nothing logged for{" "}
                {month === null ? year : `${MONTH_NAMES[month - 1]} ${year}`} yet.
              </p>
            </div>
          )}
        </div>
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
            {CATEGORIES.map(({ name, icon: Icon }) => (
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

      {/* FAB */}
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
          onDelete={editEntry ? handleDelete : undefined}
        />
      )}
    </>
  );
}
