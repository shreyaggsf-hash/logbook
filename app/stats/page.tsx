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
