"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getUserVenues } from "@/lib/venueAdmin";
import { fetchUpcomingMatches } from "@/lib/matches";
import Link from "next/link";

type UserVenue = {
  venue_id: string;
  venues: {
    id: string;
    name: string;
    neighborhood: string;
  };
};

type Match = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_time: string;
};

type VenueMatch = {
  venue_id: string;
  match_id: string;
};

export default function ManagePage() {
  const router = useRouter();
  const [userVenues, setUserVenues] = useState<UserVenue[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [venueMatches, setVenueMatches] = useState<VenueMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      const venues = await getUserVenues(user.id);
      if (venues.length === 0) {
        router.push("/");
        return;
      }

      setUserVenues(venues);

      const upcomingMatches = await fetchUpcomingMatches();
      setMatches(upcomingMatches);

      // Fetch existing venue-match associations
      const venueIds = venues.map(v => v.venues.id);
      const { data: vmData } = await supabase
        .from("venue_matches")
        .select("venue_id, match_id")
        .in("venue_id", venueIds);

      setVenueMatches(vmData || []);
      setLoading(false);
    }

    loadData();
  }, [router]);

  async function toggleMatch(venueId: string, matchId: string, isShowing: boolean) {
    if (isShowing) {
      // Remove
      await supabase
        .from("venue_matches")
        .delete()
        .eq("venue_id", venueId)
        .eq("match_id", matchId);

      setVenueMatches(prev => prev.filter(
        vm => !(vm.venue_id === venueId && vm.match_id === matchId)
      ));
    } else {
      // Add
      await supabase
        .from("venue_matches")
        .insert({ venue_id: venueId, match_id: matchId });

      setVenueMatches(prev => [...prev, { venue_id: venueId, match_id: matchId }]);
    }
  }

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Manage Your Venues</h1>
          <p className="text-gray-400">Update which matches you're showing</p>
        </div>

        {/* Venues */}
        <div className="space-y-6">
          {userVenues.map((userVenue) => {
            const venue = userVenue.venues;
            const venueMatchIds = venueMatches
              .filter(vm => vm.venue_id === venue.id)
              .map(vm => vm.match_id);

            return (
              <div key={venue.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-1">{venue.name}</h2>
                  <p className="text-gray-400">{venue.neighborhood}</p>
                </div>

                {matches.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No upcoming matches</p>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Upcoming Matches</h3>
                    {matches.map((match) => {
                      const isShowing = venueMatchIds.includes(match.id);
                      
                      return (
                        <div key={match.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-bold text-white mb-1">
                                {match.home_team} vs {match.away_team}
                              </p>
                              <p className="text-sm text-gray-400">
                                {new Date(match.kickoff_time).toLocaleString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer">
                              <span className="text-sm font-semibold text-gray-300">
                                We're showing this
                              </span>
                              <input
                                type="checkbox"
                                checked={isShowing}
                                onChange={() => toggleMatch(venue.id, match.id, isShowing)}
                                className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
