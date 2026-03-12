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
