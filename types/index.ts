export type Category =
  | "Book"
  | "Movie"
  | "TV Show"
  | "Podcast"
  | "Exhibit"
  | "Event"
  | "Album"
  | "Other";

export type Status = "Completed" | "In Progress" | "Abandoned" | "Want to";

export interface Entry {
  id: string;
  title: string;
  category: Category;
  status: Status;
  date: string | null; // ISO date string
  rating: number | null; // 1–5
  notes: string;
  creator: string; // author / director / artist / etc.
  tags: string[];
}

export interface EntryFormData {
  title: string;
  category: Category;
  status: Status;
  date: string;
  rating: number | null;
  notes: string;
  creator: string;
  tags: string;
}

export interface Stats {
  total: number;
  byCategory: Record<string, number>;
  byMonth: { month: string; count: number }[];
  byRating: { rating: number; count: number }[];
  averageRating: number | null;
  topRated: Entry[];
}
