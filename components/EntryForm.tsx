"use client";

import { useState, useEffect, useRef } from "react";
import {
  X,
  Trash2,
  BookOpen,
  Film,
  Tv,
  Mic,
  Landmark,
  Calendar,
  Music,
  LayoutGrid,
} from "lucide-react";
import type { Entry, Category } from "@/types";

const CATEGORIES: Category[] = [
  "Book", "Movie", "TV Show", "Podcast", "Exhibit", "Event", "Album", "Other",
];

const SEARCHABLE: Category[] = ["Book", "Movie", "TV Show", "Podcast", "Album"];
const EPISODE_CATEGORIES: Category[] = ["TV Show", "Podcast"];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Book: BookOpen,
  Movie: Film,
  "TV Show": Tv,
  Podcast: Mic,
  Exhibit: Landmark,
  Event: Calendar,
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
      tags: [],
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
    "w-full rounded-xl px-3.5 py-2.5 text-[15px] focus:outline-none transition-colors"
  const inputStyle = {
    background: "var(--surface)",
    border: "1.5px solid var(--border)",
    color: "var(--text-primary)",
  };
  const labelCls = "block text-[11px] font-semibold uppercase tracking-[0.1em] mb-1.5";
  const labelStyle = { color: "var(--text-secondary)" };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
      <div
        className="flex flex-col w-full max-w-sm rounded-t-3xl shadow-2xl animate-sheet-slide-up"
        style={{ background: "var(--surface)", maxHeight: "92vh" }}
      >
        {/* Drag handle */}
        <div
          className="w-9 h-1 rounded-full mx-auto mt-2.5 flex-shrink-0"
          style={{ background: "var(--border)" }}
        />

        {/* Sheet header */}
        <div
          className="flex items-center justify-between px-6 py-3.5 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--crimson)" }}
            >
              <CategoryIcon size={14} color="white" strokeWidth={2.2} />
            </div>
            <span
              className="font-playfair text-[19px] font-medium"
              style={{ color: "var(--crimson)" }}
            >
              {form.category}
            </span>
          </div>
          {isEditing && onDelete && !confirmDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-[34px] h-[34px] rounded-[8px] flex items-center justify-center transition-colors"
              style={{ border: "1.5px solid var(--border)", color: "var(--text-muted)" }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>

        {/* Scrollable form body */}
        <form
          id="entry-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-none"
        >
          {/* Episode mode banner */}
          {isEpisode && showName && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
              style={{ background: "rgba(107,26,26,0.08)" }}
            >
              <span className="font-medium shrink-0" style={{ color: "var(--crimson)" }}>
                {form.category === "Podcast" ? "Podcast" : "Show"}
              </span>
              <span className="font-semibold truncate" style={{ color: "#3D1010" }}>{showName}</span>
              <button
                type="button"
                onClick={() => toggleEpisode(false)}
                className="ml-auto shrink-0"
                style={{ color: "rgba(107,26,26,0.5)" }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Title */}
          <div className="relative">
            <label className={labelCls} style={labelStyle}>
              {isEpisode ? "Episode title" : "Title"}{" "}
              <span style={{ color: "var(--crimson)", fontSize: 14 }}>•</span>
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
              placeholder={isEpisode ? "Search for an episode..." : "e.g. The Autumn Throne…"}
              className={inputCls}
              style={{ ...inputStyle, fontSize: 15 }}
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul
                className="absolute z-10 mt-1 w-full rounded-xl shadow-lg overflow-y-auto"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  maxHeight: 288,
                }}
              >
                {suggestions.map((s, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={() => pickSuggestion(s)}
                      className="w-full text-left px-3 py-2.5 text-sm flex items-center gap-3 transition-colors"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {s.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.image} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded flex-shrink-0" style={{ background: "var(--border)" }} />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium truncate">{s.title}</div>
                        {(s.subtitle || s.creator) && (
                          <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
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
              <label className={labelCls} style={labelStyle}>
                Exhibition link{" "}
                <span className="normal-case font-normal" style={{ color: "var(--text-muted)" }}>
                  (paste URL to auto-fill)
                </span>
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={exhibitUrl}
                  onChange={(e) => handleExhibitUrlChange(e.target.value)}
                  placeholder="https://…"
                  className={inputCls}
                  style={inputStyle}
                />
                {ogFetching && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "var(--text-muted)" }}>
                    Fetching…
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Episode toggle */}
          {canPickEpisode && (
            <label
              className="flex items-center gap-2 text-sm cursor-pointer select-none"
              style={{ color: "var(--crimson)" }}
            >
              <input
                type="checkbox"
                checked={isEpisode}
                onChange={(e) => toggleEpisode(e.target.checked)}
                className="rounded"
                style={{ accentColor: "var(--crimson)" }}
              />
              Log a specific episode
            </label>
          )}

          {/* Creator + Date side-by-side */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className={labelCls} style={labelStyle}>
                {form.category === "Book" ? "Author" :
                 form.category === "Movie" || form.category === "TV Show" ? "Director" :
                 "Creator"}
              </label>
              <input
                type="text"
                value={form.creator}
                onChange={(e) => set("creator", e.target.value)}
                placeholder="e.g. E. Chadwick"
                className={inputCls}
                style={{ ...inputStyle, fontSize: 13, padding: "10px 13px" }}
              />
            </div>
            <div>
              <label className={labelCls} style={labelStyle}>Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => set("date", e.target.value)}
                className={inputCls}
                style={{ ...inputStyle, fontSize: 13, padding: "10px 13px" }}
              />
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className={labelCls} style={labelStyle}>Rating</label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={ratingWhole}
                  onChange={(e) => {
                    setRatingWhole(e.target.value);
                    if (e.target.value === "5") setRatingDec("00");
                  }}
                  className="appearance-none w-[72px] rounded-xl py-2.5 pl-3.5 pr-7 text-[18px] font-medium focus:outline-none"
                  style={{
                    fontFamily: "var(--font-playfair)",
                    background: "var(--surface)",
                    border: ratingWhole ? "1.5px solid var(--crimson)" : "1.5px solid var(--border)",
                    color: "var(--crimson)",
                  }}
                >
                  <option value="">–</option>
                  {WHOLE_OPTIONS.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px]" style={{ color: "var(--crimson)" }}>▾</span>
              </div>
              <span className="text-[20px] font-light select-none" style={{ color: "var(--text-muted)" }}>.</span>
              <div className="relative">
                <select
                  value={ratingDec}
                  onChange={(e) => setRatingDec(e.target.value)}
                  disabled={ratingWhole === ""}
                  className="appearance-none w-[80px] rounded-xl py-2.5 pl-3.5 pr-7 text-[18px] font-medium focus:outline-none disabled:opacity-40"
                  style={{
                    fontFamily: "var(--font-playfair)",
                    background: "var(--surface)",
                    border: ratingWhole ? "1.5px solid var(--crimson)" : "1.5px solid var(--border)",
                    color: "var(--crimson)",
                  }}
                >
                  {decOptions.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[10px]" style={{ color: "var(--crimson)" }}>▾</span>
              </div>
              {ratingWhole !== "" && (
                <div className="flex gap-0.5 ml-1">
                  {[1,2,3,4,5].map((i) => {
                    const val = parseFloat(`${ratingWhole}.${ratingDec}`);
                    return (
                      <span key={i} style={{ fontSize: 14, opacity: i <= Math.round(val) ? 1 : 0.2 }}>⭐</span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={labelCls} style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              placeholder="Thoughts, quotes, recommendations…"
              className="w-full rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none resize-none scrollbar-none"
              style={{ ...inputStyle, lineHeight: 1.6 }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "#DC2626" }}>{error}</p>
          )}
        </form>

        {/* Footer */}
        <div
          className="flex gap-2.5 px-6 pb-8 pt-3 flex-shrink-0"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          {confirmDelete ? (
            <>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="flex-1 h-[46px] rounded-xl text-[13px] font-medium transition-colors"
                style={{ border: "1.5px solid var(--border)", color: "var(--text-secondary)" }}
              >
                Keep
              </button>
              <button
                type="button"
                onClick={() => onDelete!(entry!.id)}
                className="flex-[2] h-[46px] rounded-xl text-[13px] font-semibold text-white"
                style={{ background: "#DC2626" }}
              >
                Delete entry
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-[46px] rounded-xl text-[13px] font-medium transition-colors"
                style={{ border: "1.5px solid var(--border)", color: "var(--text-secondary)" }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="entry-form"
                disabled={saving}
                className="flex-[2] h-[46px] rounded-xl text-[13px] font-semibold text-white disabled:opacity-50 transition-opacity"
                style={{
                  background: "var(--crimson)",
                  boxShadow: "0 4px 14px rgba(107,26,26,0.35)",
                }}
              >
                {saving ? "Saving…" : "Save Entry"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
