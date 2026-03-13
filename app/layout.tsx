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
      <body className="bg-[#F2EDE3] min-h-screen font-sans antialiased">
        <div className="max-w-sm mx-auto min-h-screen flex flex-col">
          <main className="flex-1 px-4 pt-6 pb-24">{children}</main>

          {/* Bottom tab bar */}
          <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#6B1A26]">
            <div className="max-w-sm mx-auto flex items-center">
              <Link
                href="/"
                className="flex-1 flex flex-col items-center gap-1 py-3 text-white/80 hover:text-white transition-colors"
              >
                <BookOpen size={22} />
                <span className="text-xs font-medium">Logbook</span>
              </Link>
              {/* Center slot — filled by FAB from page.tsx */}
              <div className="w-20" />
              <Link
                href="/stats"
                className="flex-1 flex flex-col items-center gap-1 py-3 text-white/80 hover:text-white transition-colors"
              >
                <BarChart2 size={22} />
                <span className="text-xs font-medium">Stats</span>
              </Link>
            </div>
          </nav>
        </div>
      </body>
    </html>
  );
}
