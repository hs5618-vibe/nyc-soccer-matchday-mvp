"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchMatchById, formatMatchTime, type Match } from "@/lib/matches";

type Venue = {
  id: string;
  name: string;
  neighborhood: string;
  address: string | null;
  is_showing: boolean;
};

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");

  const [match, setMatch] = useState<Match | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  const [goingCounts, setGoingCounts] = useState<Record<string, number>>({});

  const venueIds = useMemo(() => venues.map((v) => v.id), [venues]);

  // Load match + venues
  useEffect(() => {
    async function load() {
      if (!matchId) {
        setLoading(false);
        return;
      }

      setLoading(true);

      // 1) Load match
      const matchData = await fetchMatchById(matchId);
      setMatch(matchData);

      // 2) Load venues for this match (join venue_matches -> venues)
      const { data, error } = await supabase
        .from("venue_matches")
        .select(
          `
          venue_id,
          is_showing,
          venues (
            id,
            name,
            neighborhood,
            address
          )
        `
        )
        .eq("match_id", matchId);

      if (error) {
        console.error("Error loading venues:", error);
        setVenues([]);
      } else {
        const formatted = (data || [])
  .map((row: any): Venue | null => {
    const v = row.venues;
    if (!v) return null;

    return {
      id: String(v.id),
      name: String(v.name),
      neighborhood: String(v.neighborhood),
      address: v.address ? String(v.address) : null,
      is_showing: !!row.is_showing,
    };
  })
  .filter((v): v is Venue => v !== null);

setVenues(formatted);

        setVenues(formatted as Venue[]);
      }

      setLoading(false);
    }

    load();
  }, [matchId]);

  // Load going counts for each venue for this match
  useEffect(() => {
    async function loadGoingCounts() {
      if (!matchId || venueIds.length === 0) return;

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
        counts[row.venue_id] = (counts[row.venue_id] || 0) + 1;
      }

      setGoingCounts(counts);
    }

    loadGoingCounts();
  }, [matchId, venueIds]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="text-gray-400">Match not found</div>
      </div>
    );
  }

  const showingCount = venues.filter((v) => v.is_showing).length;
  const notConfirmedCount = venues.length - showingCount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Match Header */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 items-center gap-6">
            <div className="text-3xl font-black text-white text-center sm:text-left">
              {match.home_team}
            </div>

            <div className="text-center text-gray-500 font-extrabold text-2xl">
              VS
            </div>

            <div className="text-3xl font-black text-white text-center sm:text-right">
              {match.away_team}
            </div>
          </div>

          <div className="mt-6 text-center text-gray-400 font-semibold">
            {formatMatchTime(match.kickoff_time)}
          </div>
        </div>

        {/* Bars Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-black text-white tracking-wide">
            SPORTS BARS
          </h2>
          <div className="text-gray-400 font-semibold">
            {showingCount} showing • {notConfirmedCount} not confirmed
          </div>
        </div>

        {/* Bars List */}
        <div className="space-y-4">
          {venues.map((venue) => {
            const count = goingCounts[venue.id] || 0;

            return (
              <Link
                key={venue.id}
                href={`/venue/${venue.id}?match=${matchId}`}
                className={`block bg-white/5 border border-white/10 rounded-3xl px-6 py-5 hover:bg-white/10 transition-all ${
                  venue.is_showing ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-center justify-between">
                  {/* Left */}
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="text-xl font-extrabold text-white">
                        {venue.name}
                      </div>

                      {venue.is_showing && (
                        <span className="inline-flex rounded-full bg-green-600/20 border border-green-500/30 px-3 py-1 text-xs font-black text-green-300">
                          SHOWING
                        </span>
                      )}
                    </div>

                    <div className="mt-2 text-gray-400 text-sm">
                      {venue.neighborhood}
                      {venue.address ? ` • ${venue.address}` : ""}
                    </div>
                  </div>

                  {/* Right: going count */}
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-sm font-bold text-gray-200">
                      {count} going
                    </span>

                    <svg
                      className="w-6 h-6 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}