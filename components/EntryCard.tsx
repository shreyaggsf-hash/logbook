"use client";

import { useState } from "react";
import {
  Pencil,
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
import type { Entry } from "@/types";

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

function Stars({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span className="text-amber-400 text-sm tracking-tight">
      {"★".repeat(full)}
      {half && "½"}
      <span className="text-gray-300">{"★".repeat(empty)}</span>
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

  const CategoryIcon = CATEGORY_ICONS[entry.category] ?? LayoutGrid;

  const formattedDate = entry.date
    ? new Date(entry.date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="group bg-[#FAF7F2] rounded-xl border border-[#E5DFD5] p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-2">
        <CategoryIcon size={18} color="#6B1A26" strokeWidth={1.75} />
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 text-gray-400 hover:text-[#6B1A26] hover:bg-[#F0E5E8] rounded-lg transition-colors"
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

      <h3 className="font-semibold text-gray-900 truncate">{entry.title}</h3>
      {entry.creator && (
        <p className="text-sm text-gray-500 truncate mt-0.5">{entry.creator}</p>
      )}

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
              className="px-1.5 py-0.5 bg-[#EDEAE2] text-gray-500 rounded text-xs"
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
