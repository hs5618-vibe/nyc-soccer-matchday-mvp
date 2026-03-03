"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchMatchById, formatMatchTime, type Match } from "@/lib/matches";
import { fetchVenuesForMatch, type Venue } from "@/lib/venues"; // <- if your function name differs, rename it here

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");

  const [match, setMatch] = useState<Match | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // venue_id -> count
  const [goingCounts, setGoingCounts] = useState<Record<string, number>>({});

  const venueIds = useMemo(() => venues.map((v) => v.id), [venues]);

  useEffect(() => {
    async function load() {
      if (!matchId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      const [matchData, venueData] = await Promise.all([
        fetchMatchById(matchId),
        fetchVenuesForMatch(matchId), // <- change if your app uses a different function
      ]);

      setMatch(matchData);
      setVenues(venueData || []);
      setLoading(false);
    }

    load();
  }, [matchId]);

  useEffect(() => {
    async function loadGoingCounts() {
      if (!matchId) return;
      if (venueIds.length === 0) {
        setGoingCounts({});
        return;
      }

      try {
        // Fetch all "going" rows for this match and these venues, then count in JS
        const { data, error } = await supabase
          .from("going")
          .select("venue_id")
          .eq("match_id", matchId)
          .in("venue_id", venueIds);

        if (error) {
          console.error("Error loading going counts:", error);
          return;
        }

        const counts: Record<string, number> = {};
        for (const row of data || []) {
          const vid = row.venue_id as string;
          counts[vid] = (counts[vid] || 0) + 1;
        }

        setGoingCounts(counts);
      } catch (e) {
        console.error("loadGoingCounts unexpected error:", e);
      }
    }

    loadGoingCounts();
  }, [matchId, venueIds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!matchId || !match) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Match not found</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back
          </Link>
        </div>
      </div>
    );
  }

  // Optional: if you have a “showing vs not confirmed” concept already,
  // keep your existing counts and remove the two lines below.
  const showingCount = venues.filter((v: any) => v.is_showing === true).length;
  const notConfirmedCount = Math.max(0, venues.length - showingCount);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 mb-8">
          <div className="flex items-center gap-3 text-gray-300 mb-6">
            <span className="text-sm font-semibold">Premier League</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-6">
            <div className="flex flex-col items-center sm:items-start gap-3">
              {match.home_team_crest && (
                <img
                  src={match.home_team_crest}
                  alt={match.home_team}
                  className="w-16 h-16 object-contain"
                />
              )}
              <div className="text-3xl font-black text-white text-center sm:text-left">
                {match.home_team}
              </div>
            </div>

            <div className="text-center text-gray-500 font-extrabold text-2xl">
              VS
            </div>

            <div className="flex flex-col items-center sm:items-end gap-3">
              {match.away_team_crest && (
                <img
                  src={match.away_team_crest}
                  alt={match.away_team}
                  className="w-16 h-16 object-contain"
                />
              )}
              <div className="text-3xl font-black text-white text-center sm:text-right">
                {match.away_team}
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-center gap-2 text-gray-300 font-semibold">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
            </svg>
            <span>{formatMatchTime(match.kickoff_time)}</span>
          </div>
        </div>

        {/* Bars list header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-white tracking-wide">SPORTS BARS</h2>
          <div className="text-gray-400 font-semibold">
            {showingCount} showing • {notConfirmedCount} not confirmed
          </div>
        </div>

        {/* Bars */}
        <div className="space-y-4">
          {venues.map((venue: any) => {
            const count = goingCounts[venue.id] || 0;
            const peopleLabel = count === 1 ? "going" : "going";

            return (
              <Link
                key={venue.id}
                href={`/venue/${venue.id}?match=${matchId}`}
                className="block bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl px-6 py-5 hover:bg-white/10 transition-all"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="text-xl font-extrabold text-white truncate">
                        {venue.name}
                      </div>

                      {venue.is_showing === true && (
                        <span className="inline-flex items-center rounded-full bg-green-600/20 border border-green-500/30 px-3 py-1 text-xs font-black text-green-300">
                          SHOWING
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-3 text-gray-400">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{venue.neighborhood}</span>
                      </div>

                      {venue.address && (
                        <>
                          <span>•</span>
                          <span className="truncate">{venue.address}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* RIGHT SIDE: count + chevron */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-sm font-bold text-gray-200">
                      {count} {peopleLabel}
                    </span>

                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {venues.length === 0 && (
          <div className="text-center text-gray-400 py-10">
            No bars found for this match.
          </div>
        )}
      </div>
    </div>
  );
}