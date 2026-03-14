import type { Metadata } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Culture Logbook",
  description: "Track the books, films, shows, podcasts and events you consume.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Logbook",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.className} ${playfair.variable} min-h-screen antialiased`}
        style={{ background: "var(--bg)" }}
      >
        <div className="max-w-sm mx-auto min-h-screen flex flex-col">
          <main className="flex-1 px-6 pt-6 pb-28">{children}</main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
