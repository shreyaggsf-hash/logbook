"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus, X, BookOpen, Film, Tv, Mic, Landmark, Calendar,
  ChevronDown, RefreshCw, AlignJustify,
} from "lucide-react";
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
  Icon: React.ElementType;
}[] = [
  { name: "Book",    singular: "Book",    plural: "Books",    Icon: BookOpen },
  { name: "Movie",   singular: "Movie",   plural: "Movies",   Icon: Film     },
  { name: "TV Show", singular: "Show",    plural: "Shows",    Icon: Tv       },
  { name: "Podcast", singular: "Podcast", plural: "Podcasts", Icon: Mic      },
  { name: "Exhibit", singular: "Exhibit", plural: "Exhibits", Icon: Landmark },
  { name: "Event",   singular: "Event",   plural: "Events",   Icon: Calendar },
];

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRating(r: number) {
  return r % 1 === 0 ? r.toFixed(1) : String(r);
}

function MiniStars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-px">
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="text-[10px] leading-none"
          style={{ color: "var(--crimson)", opacity: i <= Math.round(rating) ? 1 : 0.18 }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

/** Single cover tile used in the horizontal scroll rows */
function CoverThumb({
  entry,
  Icon,
  wide,
  onClick,
}: {
  entry: Entry;
  Icon: React.ElementType;
  wide: boolean;
  onClick: () => void;
}) {
  const w = wide ? 100 : 84;
  const h = wide ? 148 : 126;
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 relative active:scale-95 transition-transform"
      style={{ width: w, height: h }}
    >
      {entry.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={entry.image}
          alt=""
          className="w-full h-full object-cover rounded-lg shadow-sm"
        />
      ) : (
        <div
          className="w-full h-full rounded-lg flex items-center justify-center shadow-sm"
          style={{ background: "linear-gradient(135deg, #E8D5D5, #D4BFBF)" }}
        >
          <Icon size={22} style={{ color: "#8B4A4A", opacity: 0.35 }} />
        </div>
      )}
      {entry.rating != null && (
        <div
          className="absolute bottom-1.5 right-1.5 bg-white text-[10px] font-bold px-1.5 py-0.5 rounded-[5px] leading-none"
          style={{ color: "var(--crimson)", border: "1.5px solid var(--crimson)" }}
        >
          {formatRating(entry.rating)}
        </div>
      )}
    </button>
  );
}

/** Drill-down bottom sheet for a single category */
function DrillDownSheet({
  category,
  entries,
  Icon,
  periodLabel,
  onClose,
  onEdit,
}: {
  category: string;
  entries: Entry[];
  Icon: React.ElementType;
  periodLabel: string;
  onClose: () => void;
  onEdit: (e: Entry) => void;
}) {
  const [sort, setSort] = useState<"date" | "rating">("date");
  const sorted = [...entries].sort((a, b) => {
    if (sort === "rating") return (b.rating ?? -1) - (a.rating ?? -1);
    return (b.date ?? "").localeCompare(a.date ?? "");
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative w-full max-w-sm mx-auto bg-[#FFFDF8] rounded-t-3xl shadow-2xl flex flex-col animate-sheet-slide-up"
        style={{ maxHeight: "76vh" }}
      >
        {/* Handle */}
        <div className="w-9 h-1 bg-[#E8DDD0] rounded-full mx-auto mt-3 mb-0 flex-shrink-0" />

        {/* Header */}
        <div className="px-6 pt-4 pb-0 flex-shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--crimson)" }}
              >
                <Icon size={15} color="white" strokeWidth={2.2} />
              </div>
              <div>
                <div
                  className="font-playfair text-[20px] font-medium leading-tight"
                  style={{ color: "var(--crimson)" }}
                >
                  {category}
                </div>
                <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  {entries.length} logged · {periodLabel}
                </div>
              </div>
            </div>
            {/* Sort pill */}
            <button
              onClick={() => setSort((s) => s === "date" ? "rating" : "date")}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors active:scale-95"
              style={{ background: "var(--bg)", border: "1.5px solid var(--border)", color: "var(--text-secondary)" }}
            >
              <AlignJustify size={12} strokeWidth={2.2} />
              {sort === "date" ? "Date" : "Rating"}
            </button>
          </div>
          <div className="h-px mt-3.5" style={{ background: "var(--border)" }} />
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto scrollbar-none px-6 pb-8">
          {sorted.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
              Nothing logged yet.
            </p>
          ) : (
            sorted.map((entry, i) => (
              <button
                key={entry.id}
                onClick={() => onEdit(entry)}
                className="w-full flex items-center gap-3 py-3 text-left active:bg-[#F5EDDF] transition-colors"
                style={{ borderBottom: i < sorted.length - 1 ? "1px solid var(--border)" : "none" }}
              >
                {/* mini thumbnail */}
                <div
                  className="flex-shrink-0 rounded-[5px] overflow-hidden"
                  style={{ width: 42, height: 62, background: "linear-gradient(155deg, #D4B89A, #B89880)" }}
                >
                  {entry.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={entry.image} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                {/* info */}
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {entry.title}
                  </div>
                  {entry.creator && (
                    <div className="text-[12px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
                      {entry.creator}
                    </div>
                  )}
                  {entry.date && (
                    <div className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                      {formatDate(entry.date)}
                    </div>
                  )}
                </div>
                {/* rating */}
                {entry.rating != null && (
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div
                      className="font-playfair text-[18px] font-medium leading-none"
                      style={{ color: "var(--crimson)" }}
                    >
                      {formatRating(entry.rating)}
                    </div>
                    <MiniStars rating={entry.rating} />
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** Type picker bottom sheet (shown when FAB is tapped) */
function TypePickerSheet({
  onPick,
  onClose,
}: {
  onPick: (cat: Category) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-auto bg-[#FFFDF8] rounded-t-3xl shadow-2xl animate-sheet-slide-up pb-8">
        <div className="w-9 h-1 bg-[#E8DDD0] rounded-full mx-auto mt-3 mb-5" />
        <div
          className="font-playfair text-[16px] mx-5 mb-4 pl-1"
          style={{ color: "var(--text-secondary)" }}
        >
          Add to logbook
        </div>
        <div className="grid grid-cols-2 gap-2.5 px-5">
          {CATEGORIES.map(({ name, Icon }) => (
            <button
              key={name}
              onClick={() => onPick(name)}
              className="flex items-center gap-2.5 rounded-[14px] px-3.5 py-4 text-left active:scale-[0.98] transition-transform"
              style={{
                background: "var(--surface)",
                border: "1.5px solid var(--border)",
              }}
            >
              <div
                className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                style={{ background: "#E8E0E0" }}
              >
                <Icon size={16} color="#7A5A5A" strokeWidth={2} />
              </div>
              <span className="text-[14px] font-medium" style={{ color: "var(--text-primary)" }}>
                {name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [drillDownCategory, setDrillDownCategory] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | null>(null);
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

  async function handleSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const data = await res.json();
      const books = data.storygraph?.created?.length ?? 0;
      setSyncMsg(`+${books} book${books === 1 ? "" : "s"} added`);
      if (books > 0) fetchEntries();
    } catch {
      setSyncMsg("Sync failed");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 4000);
    }
  }

  const periodEntries = useMemo(() => {
    if (month === null) return entries.filter((e) => e.date?.startsWith(`${year}`));
    const key = `${year}-${String(month).padStart(2, "0")}`;
    return entries.filter((e) => e.date?.startsWith(key));
  }, [entries, year, month]);

  const periodLabel = month === null ? String(year) : `${MONTH_NAMES[month - 1].slice(0, 3)} ${year}`;

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
    setSelectedCategory(null);
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
    setDrillDownCategory(null);
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
    setShowTypePicker(false);
    setShowForm(true);
  }

  const drillCategory = CATEGORIES.find((c) => c.name === drillDownCategory);
  const drillEntries = drillDownCategory
    ? periodEntries.filter((e) => e.category === drillDownCategory)
    : [];

  return (
    <>
      {/* ── Header: year + period picker + sync ── */}
      <div className="flex items-center justify-between mb-0">
        <div className="flex items-end gap-2">
          {/* Year picker */}
          <div className="relative inline-flex items-center gap-1.5">
            <span
              className="font-playfair text-[42px] font-normal leading-none"
              style={{ color: "var(--crimson)" }}
            >
              {year}
            </span>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="absolute inset-0 opacity-0 w-full cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Period badge */}
          <div className="relative inline-flex items-center">
            <div
              className="flex items-center gap-1 text-[13px] rounded-full px-2.5 py-1"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {month === null ? "Full year" : MONTH_NAMES[month - 1]}
              <ChevronDown size={10} style={{ opacity: 0.5 }} />
            </div>
            <select
              value={month ?? ""}
              onChange={(e) => setMonth(e.target.value === "" ? null : Number(e.target.value))}
              className="absolute inset-0 opacity-0 w-full cursor-pointer"
            >
              <option value="">Full year</option>
              {MONTH_NAMES.map((name, i) => (
                <option key={i} value={i + 1}>{name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Sync */}
        <div className="flex flex-col items-end">
          <button
            onClick={handleSync}
            disabled={syncing}
            className="w-8 h-8 flex items-center justify-center rounded-full disabled:opacity-50"
            style={{ color: "var(--crimson)" }}
            aria-label="Sync"
          >
            <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          </button>
          {syncMsg && (
            <span className="text-[11px] mt-0.5 whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
              {syncMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── Stats grid ── */}
      {loading ? (
        <div className="grid grid-cols-3 gap-px mt-5 rounded-2xl overflow-hidden" style={{ background: "var(--border)" }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-[62px] animate-pulse" style={{ background: "var(--surface)" }} />
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-px mt-5 rounded-2xl overflow-hidden"
          style={{ background: "var(--border)", border: "1px solid var(--border)" }}
        >
          {CATEGORIES.map(({ name, plural }) => {
            const count = periodEntries.filter((e) => e.category === name).length;
            return (
              <button
                key={name}
                onClick={() => setDrillDownCategory(name)}
                className="flex flex-col items-center py-3.5 px-3 text-center transition-colors active:opacity-70"
                style={{ background: "var(--surface)" }}
              >
                <span
                  className="font-playfair text-[22px] font-medium leading-none"
                  style={{ color: "var(--crimson)" }}
                >
                  {count}
                </span>
                <span
                  className="text-[10px] font-medium uppercase tracking-wide mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {plural}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl p-6 text-center" style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}>
          <p className="text-red-700 font-medium text-sm">{error}</p>
          <button onClick={fetchEntries} className="mt-2 text-xs text-red-600 underline">
            Retry
          </button>
        </div>
      )}

      {/* ── Per-category cover rows ── */}
      {!loading && !error && (
        <div className="mt-[18px]">
          {CATEGORIES.map(({ name, plural, Icon }, catIdx) => {
            const catEntries = periodEntries.filter((e) => e.category === name);
            if (catEntries.length === 0) return null;
            const isWide = name === "Movie" || name === "TV Show";
            const periodMeta =
              month === null
                ? `${catEntries.length} this year`
                : `${catEntries.length} in ${MONTH_NAMES[month - 1].slice(0, 3)}`;

            return (
              <div key={name}>
                {catIdx > 0 && (
                  <div className="h-px my-[18px]" style={{ background: "var(--border)" }} />
                )}
                {/* Section header */}
                <div className="flex items-baseline justify-between mb-3.5">
                  <span
                    className="font-playfair text-[20px] font-medium relative pb-1.5"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {plural}
                    <span
                      className="absolute bottom-0 left-0 h-0.5 rounded-full"
                      style={{ width: 28, background: "var(--crimson)" }}
                    />
                  </span>
                  <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
                    {periodMeta}
                  </span>
                </div>

                {/* Cover row */}
                <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1">
                  {catEntries.map((entry) => (
                    <CoverThumb
                      key={entry.id}
                      entry={entry}
                      Icon={Icon}
                      wide={isWide}
                      onClick={() => openEdit(entry)}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {periodEntries.length === 0 && (
            <div className="text-center py-16">
              <p className="text-base" style={{ color: "var(--text-muted)" }}>
                Nothing logged for{" "}
                {month === null ? year : `${MONTH_NAMES[month - 1]} ${year}`} yet.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── FAB ── */}
      <button
        onClick={() => setShowTypePicker((v) => !v)}
        className="fixed bottom-[15px] left-1/2 -translate-x-1/2 w-[52px] h-[52px] rounded-full flex items-center justify-center active:scale-95 transition-transform z-50"
        style={{
          background: "var(--crimson)",
          boxShadow: "0 4px 16px rgba(107,26,26,0.4)",
        }}
        aria-label="Add entry"
      >
        {showTypePicker ? (
          <X size={22} color="white" strokeWidth={2.5} />
        ) : (
          <Plus size={22} color="white" strokeWidth={2.5} />
        )}
      </button>

      {/* ── Type picker sheet ── */}
      {showTypePicker && (
        <TypePickerSheet
          onPick={(cat) => openWithCategory(cat)}
          onClose={() => setShowTypePicker(false)}
        />
      )}

      {/* ── Drill-down sheet ── */}
      {drillDownCategory && drillCategory && (
        <DrillDownSheet
          category={drillDownCategory}
          entries={drillEntries}
          Icon={drillCategory.Icon}
          periodLabel={periodLabel}
          onClose={() => setDrillDownCategory(null)}
          onEdit={openEdit}
        />
      )}

      {/* ── Entry form sheet ── */}
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
