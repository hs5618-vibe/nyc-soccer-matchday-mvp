"use client";

import { useEffect, useState, useMemo } from "react";
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
  league: string;
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
  const [saving, setSaving] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("all");

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const venues = await getUserVenues(user.id);
      if (venues.length === 0) {
        router.push("/");
        return;
      }

      setUserVenues(venues);

      const upcomingMatches = await fetchUpcomingMatches();
      setMatches(upcomingMatches as Match[]);

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

  const leagues = useMemo(() => {
    const unique = Array.from(new Set(matches.map(m => m.league)));
    return ['all', ...unique.sort()];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (selectedLeague !== 'all') {
      filtered = filtered.filter(m => m.league === selectedLeague);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.home_team.toLowerCase().includes(q) ||
        m.away_team.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [matches, selectedLeague, searchQuery]);

  async function toggleMatch(venueId: string, matchId: string, isShowing: boolean) {
    setSaving(`${venueId}-${matchId}`);
    try {
      if (isShowing) {
        const { error } = await supabase
          .from("venue_matches")
          .delete()
          .eq("venue_id", venueId)
          .eq("match_id", matchId);
        if (error) throw error;
        setVenueMatches(prev => prev.filter(
          vm => !(vm.venue_id === venueId && vm.match_id === matchId)
        ));
      } else {
        const { error } = await supabase
          .from("venue_matches")
          .insert({ venue_id: venueId, match_id: matchId, verified_by_owner: true });
        if (error) throw error;
        setVenueMatches(prev => [...prev, { venue_id: venueId, match_id: matchId }]);
      }
    } catch (error) {
      console.error("Error toggling match:", error);
      alert("Failed to update. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function tickAll(venueId: string, venueMatchIds: string[]) {
    const toAdd = filteredMatches.filter(m => !venueMatchIds.includes(m.id));
    if (toAdd.length === 0) return;

    const rows = toAdd.map(m => ({
      venue_id: venueId,
      match_id: m.id,
      verified_by_owner: true,
    }));

    const { error } = await supabase
      .from("venue_matches")
      .upsert(rows, { onConflict: 'venue_id,match_id' });

    if (error) {
      alert("Failed to tick all. Please try again.");
      return;
    }

    setVenueMatches(prev => [
      ...prev,
      ...toAdd.map(m => ({ venue_id: venueId, match_id: m.id }))
    ]);
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

        {/* Search + League Filter */}
        <div className="mb-6 space-y-3">
          <input
            type="text"
            placeholder="Search for a team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {leagues.map(league => (
              <button
                key={league}
                onClick={() => setSelectedLeague(league)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedLeague === league
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-transparent text-gray-400 border border-white/10 hover:border-white/20'
                }`}
              >
                {league === 'all' ? 'All' : league}
              </button>
            ))}
          </div>
        </div>

        {/* Venues */}
        <div className="space-y-6">
          {userVenues.map((userVenue) => {
            const venue = userVenue.venues;
            const venueMatchIds = venueMatches
              .filter(vm => vm.venue_id === venue.id)
              .map(vm => vm.match_id);

            const allFilteredTicked = filteredMatches.every(m => venueMatchIds.includes(m.id));

            return (
              <div key={venue.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-1">{venue.name}</h2>
                  <p className="text-gray-400">{venue.neighborhood}</p>
                </div>

                {filteredMatches.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No matches found</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                        {filteredMatches.length} matches
                      </h3>
                      {!allFilteredTicked && (
                        <button
                          onClick={() => tickAll(venue.id, venueMatchIds)}
                          className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          ✓ Tick all {selectedLeague !== 'all' ? selectedLeague : searchQuery ? `"${searchQuery}"` : ''} matches
                        </button>
                      )}
                    </div>
                    {filteredMatches.map((match) => {
                      const isShowing = venueMatchIds.includes(match.id);
                      const isSaving = saving === `${venue.id}-${match.id}`;
                      
                      return (
                        <div key={match.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white mb-1 truncate">
                                {match.home_team} vs {match.away_team}
                              </p>
                              <p className="text-sm text-gray-400">
                                {match.league} • {new Date(match.kickoff_time).toLocaleString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer flex-shrink-0">
                              <span className="text-sm font-semibold text-gray-300 hidden sm:inline">
                                {isSaving ? "Saving..." : "We're showing this"}
                              </span>
                              <input
                                type="checkbox"
                                checked={isShowing}
                                disabled={isSaving}
                                onChange={() => toggleMatch(venue.id, match.id, isShowing)}
                                className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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