"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isAdmin } from "@/lib/admin";
import { fetchUpcomingMatches } from "@/lib/matches";
import Link from "next/link";
import { Suspense } from "react";

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

function ManageVenueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venue");

  const [venueName, setVenueName] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [venueMatches, setVenueMatches] = useState<VenueMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("all");
  const [venueDefaults, setVenueDefaults] = useState<{venue_id: string, league: string | null, team: string | null}[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!venueId) {
        router.push("/admin");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const adminCheck = await isAdmin(user.id);
      if (!adminCheck) { router.push("/"); return; }

      // Load venue name
      const { data: venueData } = await supabase
        .from("venues")
        .select("name")
        .eq("id", venueId)
        .single();
      setVenueName(venueData?.name || venueId);

      // Load matches
      const upcomingMatches = await fetchUpcomingMatches();
      setMatches(upcomingMatches as Match[]);

      // Load existing venue matches
      const { data: vmData } = await supabase
        .from("venue_matches")
        .select("venue_id, match_id")
        .eq("venue_id", venueId);
      setVenueMatches(vmData || []);
      const { data: defaultsData } = await supabase
        .from("venue_defaults")
        .select("venue_id, league, team")
        .eq("venue_id", venueId);
      setVenueDefaults(defaultsData || []);
      setLoading(false);
    }

    loadData();
  }, [venueId, router]);

  const leagues = useMemo(() => {
    const unique = Array.from(new Set(matches.map(m => m.league)));
    return ['all', ...unique.sort()];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (selectedLeague !== 'all') filtered = filtered.filter(m => m.league === selectedLeague);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.home_team.toLowerCase().includes(q) || m.away_team.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [matches, selectedLeague, searchQuery]);

  const venueMatchIds = venueMatches.map(vm => vm.match_id);

  async function toggleMatch(matchId: string, isShowing: boolean) {
    if (!venueId) return;
    setSaving(matchId);
    try {
      if (isShowing) {
        await supabase.from("venue_matches").delete()
          .eq("venue_id", venueId).eq("match_id", matchId);
        setVenueMatches(prev => prev.filter(vm => vm.match_id !== matchId));
      } else {
        await supabase.from("venue_matches")
          .insert({ venue_id: venueId, match_id: matchId, verified_by_owner: true });
        setVenueMatches(prev => [...prev, { venue_id: venueId, match_id: matchId }]);
      }
    } catch (error) {
      alert("Failed to update. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function toggleDefault() {
    if (!venueId) return;
    if (selectedLeague === 'all' && !searchQuery.trim()) return;

    const league = selectedLeague !== 'all' ? selectedLeague : null;
    const team = searchQuery.trim() || null;

    const existing = venueDefaults.find(d =>
      d.venue_id === venueId && d.league === league && d.team === team
    );

    if (existing) {
      await supabase.from("venue_defaults").delete()
        .eq("venue_id", venueId)
        .eq("league", league || '')
        .eq("team", team || '');
      setVenueDefaults(prev => prev.filter(d =>
        !(d.venue_id === venueId && d.league === league && d.team === team)
      ));
    } else {
      const { data } = await supabase.from("venue_defaults")
        .upsert({ venue_id: venueId, league, team }, { onConflict: 'venue_id,league,team' })
        .select().single();
      if (data) setVenueDefaults(prev => [...prev, data]);
    }
  }
  async function tickAll() {
    if (!venueId) return;
    const toAdd = filteredMatches.filter(m => !venueMatchIds.includes(m.id));
    if (toAdd.length === 0) return;
    const rows = toAdd.map(m => ({ venue_id: venueId, match_id: m.id, verified_by_owner: true }));
    await supabase.from("venue_matches").upsert(rows, { onConflict: 'venue_id,match_id' });
    setVenueMatches(prev => [...prev, ...toAdd.map(m => ({ venue_id: venueId, match_id: m.id }))]);
  }

  async function untickAll() {
    if (!venueId) return;
    const toRemove = filteredMatches.filter(m => venueMatchIds.includes(m.id)).map(m => m.id);
    if (toRemove.length === 0) return;
    await supabase.from("venue_matches").delete().eq("venue_id", venueId).in("match_id", toRemove);
    setVenueMatches(prev => prev.filter(vm => !toRemove.includes(vm.match_id)));
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

  const allFilteredTicked = filteredMatches.every(m => venueMatchIds.includes(m.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to admin
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">ADMIN</span>
            <h1 className="text-4xl font-black text-white">{venueName}</h1>
          </div>
          <p className="text-gray-400">Managing matches on behalf of this bar</p>
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

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
          {filteredMatches.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No matches found</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                  {filteredMatches.length} matches
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {selectedLeague !== 'all' || searchQuery.trim() ? (() => {
                    const league = selectedLeague !== 'all' ? selectedLeague : null;
                    const team = searchQuery.trim() || null;
                    const isDefault = venueDefaults.some(d =>
                      d.venue_id === venueId && d.league === league && d.team === team
                    );
                    return (
                      <button
                        onClick={toggleDefault}
                        className={`text-sm font-semibold transition-colors ${
                          isDefault ? 'text-green-400 hover:text-red-400' : 'text-gray-400 hover:text-green-400'
                        }`}
                      >
                        {isDefault ? '★ Default (click to remove)' : '☆ Set as default'}
                      </button>
                    );
                  })() : null}
                  {!allFilteredTicked && (
                    <button onClick={tickAll} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                      ✓ Tick all
                    </button>
                  )}
                  {venueMatchIds.some(id => filteredMatches.map(m => m.id).includes(id)) && (
                    <button onClick={untickAll} className="text-sm font-semibold text-red-400 hover:text-red-300">
                      ✗ Untick all
                    </button>
                  )}
                </div>
              </div>
              {filteredMatches.map((match) => {
                const isShowing = venueMatchIds.includes(match.id);
                const isSaving = saving === match.id;
                return (
                  <div key={match.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white mb-1 truncate">
                          {match.home_team} vs {match.away_team}
                        </p>
                        <p className="text-sm text-gray-400">
                          {match.league} • {new Date(match.kickoff_time).toLocaleString("en-US", {
                            weekday: "short", month: "short", day: "numeric",
                            hour: "numeric", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <label className="flex items-center gap-3 cursor-pointer flex-shrink-0">
                        <span className="text-sm font-semibold text-gray-300 hidden sm:inline">
                          {isSaving ? "Saving..." : "Showing"}
                        </span>
                        <input
                          type="checkbox"
                          checked={isShowing}
                          disabled={isSaving}
                          onChange={() => toggleMatch(match.id, isShowing)}
                          className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                        />
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminManageVenuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
      </div>
    }>
      <ManageVenueContent />
    </Suspense>
  );
}