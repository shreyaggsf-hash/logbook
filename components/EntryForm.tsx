"use client";

import { useState, useEffect, useRef } from "react";
import { X, Trash2 } from "lucide-react";
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
    rating: "" as string,
    notes: "",
    creator: "",
    tags: "",
  });
  const [imageUrl, setImageUrl] = useState(entry?.image ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isEpisode, setIsEpisode] = useState(false);
  const [showName, setShowName] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justPickedRef = useRef(false);

  useEffect(() => {
    if (entry) {
      setForm({
        title: entry.title,
        category: entry.category,
        date: entry.date ?? "",
        rating: entry.rating?.toString() ?? "",
        notes: entry.notes,
        creator: entry.creator,
        tags: entry.tags.join(", "),
      });
    }
  }, [entry]);

  // Reset episode mode when category changes away from TV Show / Podcast
  useEffect(() => {
    if (!EPISODE_CATEGORIES.includes(form.category)) {
      setIsEpisode(false);
      setShowName("");
    }
  }, [form.category]);

  // Debounced suggestion fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (form.title.length < 2) {
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
    if (s.image) setImageUrl(s.image);
    setForm((prev) => ({
      ...prev,
      title: s.title,
      creator: s.creator || prev.creator,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    // Show-level pick: lock the show name for episode mode toggle
    if (!isEpisode && EPISODE_CATEGORIES.includes(form.category)) {
      setIsEpisode(false);
      setShowName(s.title);
    }
  }

  function toggleEpisode(checked: boolean) {
    setIsEpisode(checked);
    if (checked) {
      // Lock show name, clear title for episode input
      setShowName(form.title || showName);
      setForm((prev) => ({ ...prev, title: "" }));
    } else {
      // Restore show name to title field
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

    const payload = {
      title: finalTitle,
      category: form.category,
      date: form.date || null,
      rating: form.rating ? Number(form.rating) : null,
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

  const canPickEpisode =
    !isEditing && EPISODE_CATEGORIES.includes(form.category) && (showName || form.title);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
      <div className="bg-white rounded-t-2xl shadow-2xl w-full max-w-sm max-h-[92vh] overflow-y-auto">
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
          {/* Show name lock (episode mode) */}
          {isEpisode && showName && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-lg text-sm">
              <span className="text-indigo-400 font-medium shrink-0">
                {form.category === "Podcast" ? "Podcast" : "Show"}
              </span>
              <span className="text-indigo-900 font-semibold truncate">{showName}</span>
              <button
                type="button"
                onClick={() => toggleEpisode(false)}
                className="ml-auto text-indigo-300 hover:text-indigo-500 shrink-0"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Title / Episode title with autocomplete */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isEpisode ? "Episode title" : "Title"}{" "}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => {
                set("title", e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              placeholder={
                isEpisode
                  ? "Search for an episode..."
                  : "e.g. The Bear, Normal People, Dune..."
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-y-auto max-h-72">
                {suggestions.map((s, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onMouseDown={() => pickSuggestion(s)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 transition-colors flex items-center gap-3"
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

          {/* Episode toggle for TV Show / Podcast */}
          {canPickEpisode && (
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isEpisode}
                onChange={(e) => toggleEpisode(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Log a specific episode
            </label>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => {
                set("category", e.target.value);
                setSuggestions([]);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
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
                Rating (0.25–5)
              </label>
              <input
                type="number"
                min="0.25"
                max="5"
                step="0.25"
                value={form.rating}
                onChange={(e) => set("rating", e.target.value)}
                placeholder="e.g. 4.25"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
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
                  className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                  title="Delete entry"
                >
                  <Trash2 size={18} />
                </button>
              )
            ) : (
              <span />
            )}
            <div className="flex gap-3">
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
                {saving ? "Saving..." : isEditing ? "Save" : "Add entry"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
