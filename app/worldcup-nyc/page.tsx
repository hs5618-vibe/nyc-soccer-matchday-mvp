import { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { createClient } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "Where to Watch World Cup 2026 in NYC | awaydayz",
  description: "Find the best NYC bars and official FIFA fan zones showing every World Cup 2026 match. Free, verified, and updated daily. The ultimate guide to watching the World Cup in New York City.",
  keywords: "World Cup 2026 NYC, where to watch World Cup New York, FIFA World Cup bars NYC, World Cup watch party NYC, soccer bars NYC 2026",
  openGraph: {
    title: "Where to Watch World Cup 2026 in NYC",
    description: "Find verified NYC bars and official FIFA fan zones showing every World Cup 2026 match. Free and updated daily.",
    url: "https://awaydayz.co/worldcup-nyc",
    siteName: "awaydayz",
    type: "website",
  },
};

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const FAN_ZONES = [
  { id: 'wc-fan-zone-queens', name: 'Queens Fan Zone', location: 'USTA Billie Jean King National Tennis Center, Flushing Meadows', dates: 'June 11–27', borough: 'Queens' },
  { id: 'wc-fan-zone-brooklyn', name: 'Brooklyn Fan Zone', location: 'Brooklyn Bridge Park', dates: 'June 13 – July 19', borough: 'Brooklyn' },
  { id: 'wc-fan-zone-manhattan', name: 'Manhattan Fan Village', location: 'Rockefeller Center', dates: 'July 6–19', borough: 'Manhattan' },
  { id: 'wc-fan-zone-staten-island', name: 'Staten Island Fan Zone', location: 'Staten Island University Hospital Community Park', dates: 'June 29 – July 2', borough: 'Staten Island' },
  { id: 'wc-fan-zone-bronx', name: 'Bronx Fan Zone', location: 'Bronx Terminal Market', dates: 'June 13–14', borough: 'Bronx' },
];

async function getWCData() {
  const { data: matches } = await supabaseAdmin
    .from('matches')
    .select('*')
    .eq('league', 'World Cup')
    .eq('status', 'upcoming')
    .gte('kickoff_time', new Date().toISOString())
    .order('kickoff_time', { ascending: true });

    const { data: venueDefaultRows } = await supabaseAdmin
    .from('venue_defaults')
    .select('venue_id')
    .eq('league', 'World Cup');

  const venueIds = [...new Set((venueDefaultRows || []).map((r: any) => r.venue_id))].filter(
    (id) => !id.startsWith('wc-fan-zone-')
  );

  const { data: venues } = await supabaseAdmin
    .from('venues')
    .select('id, name, neighborhood, address')
    .in('id', venueIds)
    .order('name', { ascending: true });

  return { matches: matches || [], venues: venues || [] };
}

export default async function WorldCupNYCPage() {
  const { matches, venues } = await getWCData();

  const groupStage = matches.filter(m => {
    const d = new Date(m.kickoff_time);
    return d < new Date('2026-07-05');
  });

  const knockout = matches.filter(m => {
    const d = new Date(m.kickoff_time);
    return d >= new Date('2026-07-05');
  });

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
            Where to Watch the<br />
            <span className="text-yellow-400">World Cup 2026 in NYC</span>
          </h1>
          <p className="text-lg text-gray-300 mb-6 max-w-2xl mx-auto">
            The complete guide to watching every FIFA World Cup 2026 match in New York City.
            Official fan zones, verified sports bars, and matchday updates — all free, all in one place.
          </p>
          <Link
            href="/?league=World+Cup"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-full transition-all text-lg"
          >
            Find a Bar for Your Match →
          </Link>
        </div>

        {/* Official Fan Zones */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-white mb-2">🏆 Official FIFA Fan Zones</h2>
          <p className="text-gray-400 mb-6">Free official events across all five NYC boroughs, hosted by the NYNJ 2026 Host Committee.</p>
          <div className="space-y-3">
            {FAN_ZONES.map(zone => (
              <Link
                key={zone.id}
                href={`/venue/${zone.id}`}
                className="block bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 hover:bg-yellow-500/20 transition-all"
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
              </Link>
            ))}
          </div>
        </div>

        {/* Sports Bars */}
        <div className="mb-12">
          <h2 className="text-2xl font-black text-white mb-2">⚽ NYC Sports Bars Showing the World Cup</h2>
          <p className="text-gray-400 mb-4">{venues.length} bars across NYC confirmed to show World Cup 2026 matches — updated daily.</p>
          <Link
            href="/results"
            className="flex items-center justify-between gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all"
          >
            <div>
              <p className="font-bold text-white text-lg">{venues.length} verified bars</p>
              <p className="text-gray-400 text-sm">Browse the full list, filter by neighborhood, and find your match →</p>
            </div>
            <svg className="w-6 h-6 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Group Stage Matches */}
        {groupStage.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-white mb-2">📅 Group Stage Matches</h2>
            <p className="text-gray-400 mb-6">June 11 – July 2, 2026 · {groupStage.length} matches</p>
            <div className="space-y-2">
              {groupStage.map((match: any) => (
                <Link
                  key={match.id}
                  href={`/results?match=${match.id}`}
                  className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {match.home_team_crest && <img src={match.home_team_crest} className="w-6 h-6 object-contain flex-shrink-0" />}
                    <span className="text-sm font-semibold text-white truncate">{match.home_team}</span>
                    <span className="text-gray-500 text-xs">vs</span>
                    <span className="text-sm font-semibold text-white truncate">{match.away_team}</span>
                    {match.away_team_crest && <img src={match.away_team_crest} className="w-6 h-6 object-contain flex-shrink-0" />}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(match.kickoff_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Knockout Matches */}
        {knockout.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-black text-white mb-2">🏆 Knockout Stage</h2>
            <p className="text-gray-400 mb-6">July 5–19, 2026 · Teams TBD after group stage</p>
            <div className="space-y-2">
              {knockout.map((match: any) => (
                <Link
                  key={match.id}
                  href={`/results?match=${match.id}`}
                  className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {match.home_team_crest && <img src={match.home_team_crest} className="w-6 h-6 object-contain flex-shrink-0" />}
                    <span className="text-sm font-semibold text-white truncate">{match.home_team}</span>
                    <span className="text-gray-500 text-xs">vs</span>
                    <span className="text-sm font-semibold text-white truncate">{match.away_team}</span>
                    {match.away_team_crest && <img src={match.away_team_crest} className="w-6 h-6 object-contain flex-shrink-0" />}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {new Date(match.kickoff_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-black text-white mb-3">Ready to find your spot?</h2>
          <p className="text-gray-300 mb-6">Search any World Cup match and instantly see which NYC bars are showing it.</p>
          <Link
            href="/?league=World+Cup"
            className="inline-block bg-yellow-500 hover:bg-yellow-400 text-black font-bold px-8 py-3 rounded-full transition-all text-lg"
          >
            Find World Cup Bars →
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
            ← Back to all matches
          </Link>
        </div>

      </div>
    </div>
  );
}