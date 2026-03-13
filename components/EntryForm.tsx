"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Trash2,
  BookOpen,
  Film,
  Tv,
  Mic2,
  Landmark,
  CalendarDays,
  Music,
  LayoutGrid,
} from "lucide-react";
import type { Entry, Category } from "@/types";

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

const SEARCHABLE: Category[] = ["Book", "Movie", "TV Show", "Podcast", "Album"];
const EPISODE_CATEGORIES: Category[] = ["TV Show", "Podcast"];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Book: BookOpen,
  Movie: Film,
  "TV Show": Tv,
  Podcast: Mic2,
  Exhibit: Landmark,
  Event: CalendarDays,
  Album: Music,
  Other: LayoutGrid,
};

const WHOLE_OPTIONS = ["0", "1", "2", "3", "4", "5"];
const DEC_OPTIONS = ["00", "25", "50", "75"];

interface Suggestion {
  title: string;
  creator: string;
  subtitle?: string;
  image?: string | null;
}

async function fetchSuggestions(
  query: string,
  category: Category,
  episodeMode: boolean,
  showName: string
): Promise<Suggestion[]> {
  if (query.length < 2 || !SEARCHABLE.includes(category)) return [];
  try {
    const params = new URLSearchParams({ q: query, category });
    if (episodeMode) params.set("episode", "1");
    if (showName) params.set("showName", showName);
    const res = await fetch(`/api/search?${params}`);
    return await res.json();
  } catch {
    return [];
  }
}

function parseRating(r: number | null | undefined): { whole: string; dec: string } {
  if (r == null) return { whole: "", dec: "00" };
  const whole = Math.floor(r).toString();
  const frac = Math.round((r % 1) * 100);
  const dec = frac === 0 ? "00" : frac.toString().padStart(2, "0");
  return { whole, dec };
}

interface Props {
  entry?: Entry | null;
  initialCategory?: Category;
  onSave: (entry: Entry) => void;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export default function EntryForm({ entry, initialCategory, onSave, onClose, onDelete }: Props) {
  const isEditing = !!entry;

  const [form, setForm] = useState({
    title: "",
    category: (initialCategory ?? "Book") as Category,
    date: new Date().toISOString().slice(0, 10),
    notes: "",
    creator: "",
    tags: "",
  });
  const [ratingWhole, setRatingWhole] = useState("");
  const [ratingDec, setRatingDec] = useState("00");
  const [imageUrl, setImageUrl] = useState(entry?.image ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [exhibitUrl, setExhibitUrl] = useState("");
  const [ogFetching, setOgFetching] = useState(false);
  const ogDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEpisode, setIsEpisode] = useState(false);
  const [showName, setShowName] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justPickedRef = useRef(false);
  // Only show autocomplete when the user is actively typing — not on initial form population
  const userTypedRef = useRef(false);

  useEffect(() => {
    userTypedRef.current = false;
    if (entry) {
      const { whole, dec } = parseRating(entry.rating);
      setRatingWhole(whole);
      setRatingDec(dec);
      setForm({
        title: entry.title,
        category: entry.category,
        date: entry.date ?? "",
        notes: entry.notes,
        creator: entry.creator,
        tags: entry.tags.join(", "),
      });
    }
  }, [entry]);

  useEffect(() => {
    if (!EPISODE_CATEGORIES.includes(form.category)) {
      setIsEpisode(false);
      setShowName("");
    }
  }, [form.category]);

  function handleExhibitUrlChange(url: string) {
    setExhibitUrl(url);
    if (ogDebounceRef.current) clearTimeout(ogDebounceRef.current);
    if (!url.startsWith("http")) return;
    ogDebounceRef.current = setTimeout(async () => {
      setOgFetching(true);
      try {
        const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.image) setImageUrl(data.image);
        if (data.title && !form.title.trim()) set("title", data.title);
      } catch {
        // ignore
      } finally {
        setOgFetching(false);
      }
    }, 600);
  }

  // Debounced suggestion fetch — only runs when user has actively typed
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (form.title.length < 2 || !userTypedRef.current) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      if (justPickedRef.current) {
        justPickedRef.current = false;
        return;
      }
      const results = await fetchSuggestions(form.title, form.category, isEpisode, showName);
      setSuggestions(results);
      if (results.length > 0) setShowSuggestions(true);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.title, form.category, isEpisode, showName]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function pickSuggestion(s: Suggestion) {
    justPickedRef.current = true;
    userTypedRef.current = false;
    if (s.image) setImageUrl(s.image);
    setForm((prev) => ({
      ...prev,
      title: s.title,
      creator: s.creator || prev.creator,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    if (!isEpisode && EPISODE_CATEGORIES.includes(form.category)) {
      setIsEpisode(false);
      setShowName(s.title);
    }
  }

  function toggleEpisode(checked: boolean) {
    setIsEpisode(checked);
    if (checked) {
      setShowName(form.title || showName);
      setForm((prev) => ({ ...prev, title: "" }));
    } else {
      setForm((prev) => ({ ...prev, title: showName }));
    }
    setSuggestions([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError(isEpisode ? "Episode title is required." : "Title is required.");
      return;
    }
    setSaving(true);
    setError("");

    const finalTitle =
      isEpisode && showName
        ? `${showName} – ${form.title.trim()}`
        : form.title.trim();

    const ratingNum =
      ratingWhole === "" ? null : parseFloat(`${ratingWhole}.${ratingDec}`);

    const payload = {
      title: finalTitle,
      category: form.category,
      date: form.date || null,
      rating: ratingNum,
      notes: form.notes.trim(),
      creator: form.creator.trim(),
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      image: imageUrl || null,
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

  const CategoryIcon = CATEGORY_ICONS[form.category] ?? LayoutGrid;
  const canPickEpisode =
    !isEditing && EPISODE_CATEGORIES.includes(form.category) && (showName || form.title);
  const decOptions = ratingWhole === "5" ? ["00"] : DEC_OPTIONS;

  const inputCls =
    "w-full bg-[#EDEAE2] border-0 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6B1A26]/30";
  const labelCls = "block text-sm font-medium text-gray-800 mb-1.5";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div className="bg-[#FAF7F2] rounded-t-2xl shadow-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto animate-sheet-slide-up">
        {/* Category icon header */}
        <div className="flex flex-col items-center pt-7 pb-1 px-6">
          <CategoryIcon size={48} color="#6B1A26" strokeWidth={1.5} />
          <select
            value={form.category}
            onChange={(e) => {
              set("category", e.target.value);
              setSuggestions([]);
            }}
            className="mt-2 text-xs text-[#6B1A26] font-medium bg-transparent border-0 focus:outline-none cursor-pointer"
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-3 space-y-4">
          {/* Show name lock (episode mode) */}
          {isEpisode && showName && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#6B1A26]/10 rounded-lg text-sm">
              <span className="text-[#6B1A26] font-medium shrink-0">
                {form.category === "Podcast" ? "Podcast" : "Show"}
              </span>
              <span className="text-[#3D1010] font-semibold truncate">{showName}</span>
              <button
                type="button"
                onClick={() => toggleEpisode(false)}
                className="ml-auto text-[#6B1A26]/50 hover:text-[#6B1A26] shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Title with autocomplete */}
          <div className="relative">
            <label className={labelCls}>
              {isEpisode ? "Episode title" : "Title"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => {
                userTypedRef.current = true;
                set("title", e.target.value);
              }}
              onFocus={() => {
                if (userTypedRef.current && suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={
                isEpisode ? "Search for an episode..." : "e.g. The Autumn Throne..."
              }
              className={inputCls}
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto max-h-72">
                {suggestions.map((s, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={() => pickSuggestion(s)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#6B1A26]/5 transition-colors flex items-center gap-3"
                    >
                      {s.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.image}
                          alt=""
                          className="w-10 h-10 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 truncate">{s.title}</div>
                        {(s.subtitle || s.creator) && (
                          <div className="text-gray-400 text-xs truncate">
                            {s.subtitle ?? s.creator}
                          </div>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Exhibit URL */}
          {form.category === "Exhibit" && (
            <div>
              <label className={labelCls}>
                Exhibition link{" "}
                <span className="text-gray-400 font-normal">(paste URL to auto-fill image)</span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={exhibitUrl}
                  onChange={(e) => handleExhibitUrlChange(e.target.value)}
                  placeholder="https://www.metmuseum.org/exhibitions/..."
                  className={inputCls}
                />
                {ogFetching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                    Fetching…
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Episode toggle */}
          {canPickEpisode && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isEpisode}
                onChange={(e) => toggleEpisode(e.target.checked)}
                className="rounded border-gray-300 text-[#6B1A26] focus:ring-[#6B1A26]"
              />
              Log a specific episode
            </label>
          )}

          {/* Creator */}
          <div>
            <label className={labelCls}>
              Creator{" "}
              <span className="text-gray-400 font-normal">(author / director / artist)</span>
            </label>
            <input
              type="text"
              value={form.creator}
              onChange={(e) => set("creator", e.target.value)}
              placeholder="e.g. Elizabeth Chadwick"
              className={inputCls}
            />
          </div>

          {/* Date + Rating */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date Consumed</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Rating (0.25–5)</label>
              {/* Storygraph-style split dropdowns */}
              <div className="flex items-center gap-1.5">
                <select
                  value={ratingWhole}
                  onChange={(e) => {
                    setRatingWhole(e.target.value);
                    if (e.target.value === "5") setRatingDec("00");
                  }}
                  className="flex-1 bg-[#EDEAE2] border-0 rounded-lg px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#6B1A26]/30 appearance-none"
                >
                  <option value="">–</option>
                  {WHOLE_OPTIONS.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
                <span className="text-gray-500 font-bold text-xl leading-none select-none">·</span>
                <select
                  value={ratingDec}
                  onChange={(e) => setRatingDec(e.target.value)}
                  disabled={ratingWhole === ""}
                  className="flex-1 bg-[#EDEAE2] border-0 rounded-lg px-2 py-2.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-[#6B1A26]/30 appearance-none disabled:opacity-40"
                >
                  {decOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>
              Tags <span className="text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="e.g. historical fiction"
              className={inputCls}
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Thoughts, quotes, recommendations..."
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-between items-center pt-1">
            {isEditing && onDelete ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onDelete(entry!.id)}
                    className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="p-2 bg-[#EDEAE2] text-[#6B1A26] hover:bg-[#E0D8CE] rounded-lg transition-colors"
                  title="Delete entry"
                >
                  <Trash2 size={16} />
                </button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-3 items-center">
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
                className="px-5 py-2 bg-[#3D1A20] text-white text-sm font-medium rounded-lg hover:bg-[#4D2028] disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
