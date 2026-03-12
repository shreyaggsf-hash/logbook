"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { Entry } from "@/types";

const CATEGORY_COLORS: Record<string, string> = {
  Book: "#f59e0b",
  Movie: "#3b82f6",
  "TV Show": "#8b5cf6",
  Podcast: "#10b981",
  Exhibit: "#ec4899",
  Event: "#f97316",
  Album: "#06b6d4",
  Other: "#6b7280",
};

const PIE_COLORS = [
  "#6366f1", "#f59e0b", "#3b82f6", "#10b981",
  "#ec4899", "#f97316", "#8b5cf6", "#06b6d4",
];

interface Props {
  entries: Entry[];
  year: string;
}

export default function StatsView({ entries, year }: Props) {
  const filtered = year
    ? entries.filter((e) => e.date?.startsWith(year))
    : entries;

  const completed = filtered.filter((e) => e.status === "Completed");

  // By category
  const byCategoryMap: Record<string, number> = {};
  for (const e of filtered) {
    byCategoryMap[e.category] = (byCategoryMap[e.category] ?? 0) + 1;
  }
  const byCategory = Object.entries(byCategoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // By month
  const byMonthMap: Record<string, number> = {};
  for (const e of filtered) {
    if (!e.date) continue;
    const month = e.date.slice(0, 7); // YYYY-MM
    byMonthMap[month] = (byMonthMap[month] ?? 0) + 1;
  }
  const byMonth = Object.entries(byMonthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month: new Date(month + "-01").toLocaleDateString("en-GB", {
        month: "short",
        year: "2-digit",
      }),
      count,
    }));

  // Average rating
  const rated = completed.filter((e) => e.rating !== null);
  const avgRating =
    rated.length > 0
      ? (rated.reduce((s, e) => s + e.rating!, 0) / rated.length).toFixed(1)
      : null;

  // Top rated
  const topRated = [...completed]
    .filter((e) => e.rating !== null)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 5);

  if (filtered.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        No entries{year ? ` for ${year}` : ""} yet.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total logged" value={filtered.length} />
        <StatCard label="Completed" value={completed.length} />
        <StatCard
          label="Avg rating"
          value={avgRating ? `${avgRating} / 5` : "—"}
        />
        <StatCard
          label="Categories"
          value={Object.keys(byCategoryMap).length}
        />
      </div>

      {/* By category */}
      <section>
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          By category
        </h3>
        <div className="flex flex-col sm:flex-row gap-6 items-center">
          <div className="w-full sm:w-72 h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={byCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {byCategory.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={
                        CATEGORY_COLORS[entry.name] ??
                        PIE_COLORS[i % PIE_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-2 w-full">
            {byCategory.map((c) => (
              <div key={c.name} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    background:
                      CATEGORY_COLORS[c.name] ?? PIE_COLORS[0],
                  }}
                />
                <span className="text-sm text-gray-700 flex-1">{c.name}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-2 rounded-full bg-indigo-200"
                    style={{
                      width: `${Math.round(
                        (c.value / filtered.length) * 120
                      )}px`,
                    }}
                  />
                  <span className="text-sm font-medium text-gray-900 w-5 text-right">
                    {c.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* By month */}
      {byMonth.length > 1 && (
        <section>
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Timeline
          </h3>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={byMonth} barSize={24}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Top rated */}
      {topRated.length > 0 && (
        <section>
          <h3 className="text-base font-semibold text-gray-800 mb-4">
            Top rated
          </h3>
          <ol className="space-y-2">
            {topRated.map((e, i) => (
              <li key={e.id} className="flex items-center gap-3">
                <span className="text-xs font-mono text-gray-400 w-5">
                  {i + 1}.
                </span>
                <span className="text-sm flex-1 text-gray-900">{e.title}</span>
                <span className="text-xs text-gray-400">{e.category}</span>
                <span className="text-amber-400 text-sm">
                  {"★".repeat(e.rating ?? 0)}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
      <div className="text-2xl font-bold text-indigo-600">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
