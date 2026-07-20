import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "How NYC Watched the World Cup 2026 | awaydayz Recap",
  description: "A recap of how New York City watched the FIFA World Cup 2026 — the bars, the boroughs, and the fans. Presented by awaydayz, official data partner of the NY/NJ World Cup 2026 Concierge.",
  keywords: "World Cup 2026 NYC recap, where NYC watched the World Cup, FIFA World Cup bars NYC, World Cup NYC recap",
  openGraph: {
    title: "How NYC Watched the World Cup 2026",
    description: "A recap of how New York City watched the FIFA World Cup 2026, presented by awaydayz.",
    url: "https://awaydayz.co/worldcup-nyc",
    siteName: "awaydayz",
    type: "website",
  },
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const FAN_ZONES = [
  { id: 'wc-fan-zone-queens', name: 'Queens Fan Zone', location: 'USTA Billie Jean King National Tennis Center, Flushing Meadows', dates: 'June 11–27', borough: 'Queens' },
  { id: 'wc-fan-zone-brooklyn', name: 'Brooklyn Fan Zone', location: 'Brooklyn Bridge Park', dates: 'June 13 – July 19', borough: 'Brooklyn' },
  { id: 'wc-fan-zone-manhattan', name: 'Manhattan Fan Village', location: 'Rockefeller Center', dates: 'July 6–19', borough: 'Manhattan' },
  { id: 'wc-fan-zone-staten-island', name: 'Staten Island Fan Zone', location: 'Staten Island University Hospital Community Park', dates: 'June 29 – July 2', borough: 'Staten Island' },
  { id: 'wc-fan-zone-bronx', name: 'Bronx Fan Zone', location: 'Bronx Terminal Market', dates: 'June 13–14', borough: 'Bronx' },
];

async function getRecapData() {
  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('league', 'World Cup')
    .order('kickoff_time', { ascending: true });

  const { data: countData } = await supabaseAdmin
    .rpc('get_wc_venue_count');

  return { matches: matches || [], venueCount: countData || 0 };
}

export default async function WorldCupRecapPage() {
  const { matches, venueCount } = await getRecapData();
  const totalMatches = matches.length;
  const totalVenues = venueCount + FAN_ZONES.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <img
              src="https://crests.football-data.org/wm26.png"
              alt="FIFA World Cup 2026"
              className="h-20 w-auto object-contain"
            />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
            How NYC Watched<br />
            <span className="text-yellow-400">The World Cup 2026</span>
          </h1>
          <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
            For six weeks, New York City turned into a home away from home for every team in the tournament.
            Here's a look back at how the city watched it all.
          </p>
          <Link
            href="/venues"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-full transition-all text-lg"
          >
            Browse Venues →
          </Link>
        </div>

        {/* Recap Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-3xl font-black text-yellow-400 mb-1">{totalVenues}+</p>
            <p className="text-gray-400 text-sm">Verified bars & fan zones across NYC</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-3xl font-black text-yellow-400 mb-1">5</p>
            <p className="text-gray-400 text-sm">Boroughs covered, no borough left out</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
            <p className="text-3xl font-black text-yellow-400 mb-1">{totalMatches}</p>
            <p className="text-gray-400 text-sm">World Cup matches tracked start to finish</p>
          </div>
        </div>

        {/* Concierge Partnership Credit */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-12 text-center">
          <p className="text-white font-semibold mb-2">
            awaydayz was proud to be the official data partner of the NY/NJ World Cup 2026 Concierge
          </p>
          <p className="text-gray-400 text-sm mb-4">
            Our verified venue data helped power the official fan guide for the region, alongside Neurun.
          </p>
          <a
            href="https://nynjfwc26.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block text-yellow-300 font-semibold text-sm hover:text-yellow-200 transition-colors"
          >
            View the official Concierge →
          </a>
        </div>

        {/* Official Fan Zones */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-white mb-2">🏆 Official FIFA Fan Zones</h2>
          <p className="text-gray-400 mb-6">Free official events across all five NYC boroughs, hosted by the NYNJ 2026 Host Committee.</p>
          <div className="space-y-3">
            {FAN_ZONES.map(zone => (
              <div
                key={zone.id}
                className="block bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <img src="https://crests.football-data.org/wm26.png" className="w-5 h-5 object-contain" alt="WC26" />
                      <h3 className="font-bold text-white">{zone.name}</h3>
                      <span className="bg-yellow-500/20 text-yellow-300 text-xs font-bold px-2 py-0.5 rounded-full">{zone.borough}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{zone.location}</p>
                  </div>
                  <span className="text-yellow-300 text-sm font-semibold flex-shrink-0">{zone.dates}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sports Bars */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-white mb-2">⚽ The Bars That Showed Up</h2>
          <p className="text-gray-400 mb-4">{totalVenues} bars and fan zones across NYC confirmed to show World Cup 2026 matches, verified one by one.</p>
          <Link
            href="/venues"
            className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all"
          >
            <div>
              <p className="font-bold text-white text-lg">Browse every venue</p>
              <p className="text-gray-400 text-sm">See the full list, filter by neighborhood, or view the map →</p>
            </div>
            <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* CTA */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-black text-white mb-3">The World Cup may be over, but we're not going anywhere</h2>
          <p className="text-gray-300 mb-6">Premier League, Champions League, and every other match — we'll help you find your bar.</p>
          <Link
            href="/"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-full transition-all text-lg"
          >
            Find Your Bar →
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Back to home
          </Link>
        </div>

      </div>
    </div>
  );
}