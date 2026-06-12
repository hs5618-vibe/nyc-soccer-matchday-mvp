"use client";

import Link from "next/link";

const CRAWLER_LOGO = "https://dvtqvuolzemazkyawrup.supabase.co/storage/v1/object/public/venue-images/Crawler.png";
const WC_LOGO = "https://crests.football-data.org/wm26.png";

const GAMES = [
  {
    matchId: "world_cup-537345",
    date: "Friday, June 12",
    time: "9:00 PM ET",
    home: "United States",
    away: "Paraguay",
    homeFlag: "🇺🇸",
    awayFlag: "🇵🇾",
    venue: {
      id: "playwright-celtic-pub",
      name: "Playwright Celtic Pub",
      neighborhood: "Hell's Kitchen",
      borough: "Manhattan",
      address: "732 8th Ave, New York, NY 10036",
    },
  },
  {
    matchId: "world_cup-537348",
    date: "Thursday, June 19",
    time: "3:00 PM ET",
    home: "United States",
    away: "Australia",
    homeFlag: "🇺🇸",
    awayFlag: "🇦🇺",
    venue: {
      id: "the-laurels",
      name: "The Laurels",
      neighborhood: "Gramercy",
      borough: "Manhattan",
      address: "231 2nd Ave, New York, NY 10003",
    },
  },
  {
    matchId: "world_cup-537349",
    date: "Wednesday, June 25",
    time: "10:00 PM ET",
    home: "Turkey",
    away: "United States",
    homeFlag: "🇹🇷",
    awayFlag: "🇺🇸",
    venue: {
      id: "db-coopers",
      name: "D.B. Cooper's",
      neighborhood: "Hell's Kitchen",
      borough: "Manhattan",
      address: "506 9th Ave, New York, NY 10018",
    },
  },
];

export default function CrawlerPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to matches
        </Link>

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-6">
            <img src={WC_LOGO} alt="FIFA World Cup 2026" className="h-14 w-auto object-contain" />
            <span className="text-white/30 text-3xl font-light">×</span>
            <img src={CRAWLER_LOGO} alt="Crawler" className="h-14 w-14 rounded-2xl object-contain" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-3">
            Awaydayz × Crawler<br />
            <span className="text-blue-400">Team USA Watch Party Series</span>
          </h1>
          <p className="text-gray-400 text-base max-w-xl mx-auto">
            Three USA games. Three great bars. Find your spot, show up, and cheer on the USMNT with fellow fans across NYC.
          </p>
        </div>

        {/* Games */}
        <div className="space-y-6 mb-12">
          {GAMES.map((game, i) => (
            <div
              key={game.matchId}
              className="bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8"
            >
              {/* Game number + date */}
              <div className="flex items-center gap-3 mb-5">
                <span className="bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold px-3 py-1 rounded-full">
                  Game {i + 1} of 3
                </span>
                <span className="text-gray-400 text-sm">{game.date} · {game.time}</span>
              </div>

              {/* Match */}
              <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">{game.homeFlag}</span>
                  <span className="font-bold text-white text-sm sm:text-base text-center">{game.home}</span>
                </div>
                <span className="text-gray-500 font-bold text-xl">vs</span>
                <div className="flex flex-col items-center gap-2">
                  <span className="text-4xl">{game.awayFlag}</span>
                  <span className="font-bold text-white text-sm sm:text-base text-center">{game.away}</span>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10 pt-5">
                <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-3 flex items-center gap-2">
                  <img src={CRAWLER_LOGO} className="w-4 h-4 rounded-full" alt="Crawler" />
                  Official Watch Party Venue
                </p>
                <Link
                  href={`/venue/${game.venue.id}?match=${game.matchId}`}
                  className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div>
                    <h3 className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors mb-1">
                      {game.venue.name}
                    </h3>
                    <p className="text-gray-400 text-sm">{game.venue.neighborhood}, {game.venue.borough}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{game.venue.address}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <a
                      href="https://onelink.to/crawler"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1.5 bg-white/10 border border-white/20 text-gray-300 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-white/20 transition-all"
                    >
                      <img src={CRAWLER_LOGO} className="w-4 h-4 rounded-full" alt="Crawler" />
                      Book on Crawler
                    </a>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>

                {/* View all bars for this game */}
                <Link
                  href={`/results?match=${game.matchId}`}
                  className="mt-3 flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  View all bars showing this game →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-3xl p-8 text-center mb-8">
          <h2 className="text-xl font-black text-white mb-2">Find any World Cup bar in NYC</h2>
          <p className="text-gray-400 text-sm mb-5">165+ verified venues across all five boroughs. Free, instant, updated daily.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/worldcup-nyc"
              className="inline-flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-6 py-3 rounded-full transition-all"
            >
              <img src={WC_LOGO} className="w-5 h-5 object-contain" alt="WC" />
              Full World Cup Guide
            </Link>
            <a
              href="https://onelink.to/crawler"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-6 py-3 rounded-full transition-all border border-white/20"
            >
              <img src={CRAWLER_LOGO} className="w-5 h-5 rounded-full" alt="Crawler" />
              Download Crawler
            </a>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Back to all matches
          </Link>
        </div>

      </div>
    </div>
  );
}
