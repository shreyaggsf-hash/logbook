"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BarChart2 } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();
  const isLogbook = pathname === "/";
  const isStats = pathname === "/stats";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFFDF8] border-t border-[#E8DDD0]">
      <div className="max-w-sm mx-auto flex items-center" style={{ height: 82, paddingBottom: 16 }}>
        <Link
          href="/"
          className={`flex-1 flex flex-col items-center gap-1 pt-2 pb-1 relative transition-colors ${
            isLogbook ? "text-[#6B1A1A]" : "text-[#A8886A]"
          }`}
        >
          {isLogbook && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-[#6B1A1A] rounded-b-full" />
          )}
          <BookOpen size={20} />
          <span className="text-[11px] font-medium tracking-wide">Logbook</span>
        </Link>

        {/* center slot — FAB sits here */}
        <div className="w-20" />

        <Link
          href="/stats"
          className={`flex-1 flex flex-col items-center gap-1 pt-2 pb-1 relative transition-colors ${
            isStats ? "text-[#6B1A1A]" : "text-[#A8886A]"
          }`}
        >
          {isStats && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-[#6B1A1A] rounded-b-full" />
          )}
          <BarChart2 size={20} />
          <span className="text-[11px] font-medium tracking-wide">Stats</span>
        </Link>
      </div>
    </nav>
  );
}
