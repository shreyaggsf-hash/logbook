import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { BookOpen, BarChart2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Culture Logbook",
  description: "Track the books, films, shows, podcasts and events you consume.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen font-sans antialiased">
        <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-gray-900">
              <BookOpen size={20} className="text-indigo-600" />
              Culture Logbook
            </Link>
            <nav className="flex items-center gap-1">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <BookOpen size={15} />
                Logbook
              </Link>
              <Link
                href="/stats"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <BarChart2 size={15} />
                Stats
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
