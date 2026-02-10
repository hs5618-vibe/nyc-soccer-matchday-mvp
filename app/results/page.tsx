"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { fetchShowingsForMatch, type ShowingRow } from "../../lib/showings";
import { fetchGoingCount } from "../../lib/going";
import { fetchMatchById } from "@/lib/matches";
import { supabase } from "@/lib/supabaseClient";
import { getProfile } from "@/lib/profiles";

type Venue = {
  id: string;
  name: string;
  neighborhood: string;
  bar_type: string;
  club_name: string | null;
};

type VenueWithStatus = {
  venue: Venue;
  status: 'showing' | 'not_showing' | 'unknown';
  note: string | null;
  goingCount: number;
  recentUpdates: Array<{
    id: string;
    message: string;
    created_at: string;
    username: string;
    bars_visited: number;
  }>;
};

function ResultsContent() {
  const searchParams = useSearchParams();
  const matchId = useMemo(() => searchParams.get("match") ?? "man-utd-v-liverpool", [searchParams]);

  const [venues, setVenues] = useState<VenueWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [matchData, setMatchData] = useState<{ home_team: string; away_team: string } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorMsg(null);
        
        // Fetch match data
        const matchInfo = await fetchMatchById(matchId);
        if (!cancelled && matchInfo) {
          setMatchData({ home_team: matchInfo.home_team, away_team: matchInfo.away_team });
        }
        
        // Fetch ALL venues
        const { data: allVenues, error: venuesError } = await supabase
          .from("venues")
          .select("*")
          .order("name");

        if (venuesError) throw venuesError;

        // Fetch showings for this match
        const { data: showings, error: showingsError } = await supabase
          .from("showings")
          .select("venue_id, status, note")
          .eq("match_id", matchId);

        if (showingsError) throw showingsError;

        // Fetch going counts for all venues
        const goingPromises = (allVenues || []).map(async (venue) => {
          const count = await fetchGoingCount({ matchId, venueId: venue.id });
          return { venueId: venue.id, count };
        });

        const goingResults = await Promise.all(goingPromises);
        const goingMap: Record<string, number> = {};
        goingResults.forEach(r => {
          goingMap[r.venueId] = r.count;
        });

        // Fetch recent updates for all venues
        const { data: allUpdates, error: updatesError } = await supabase
          .from("updates")
          .select("id, message, created_at, user_id, venue_id")
          .eq("match_id", matchId)
          .order("created_at", { ascending: false });

        if (updatesError) throw updatesError;

        // Group updates by venue and fetch profiles
        const updatesByVenue: Record<string, any[]> = {};
        for (const update of (allUpdates || [])) {
          if (!updatesByVenue[update.venue_id]) {
            updatesByVenue[update.venue_id] = [];
          }
          if (updatesByVenue[update.venue_id].length < 2) {
            const profile = await getProfile(update.user_id);
            updatesByVenue[update.venue_id].push({
              id: update.id,
              message: update.message,
              created_at: update.created_at,
              username: profile?.username || "Anonymous",
              bars_visited: profile?.bars_visited || 0,
            });
          }
        }

        // Combine venues with their showing status and updates
        const venuesWithStatus: VenueWithStatus[] = (allVenues || []).map(venue => {
          const showing = showings?.find(s => s.venue_id === venue.id);
          return {
            venue,
            status: showing?.status === 'showing' ? 'showing' : 
                   showing?.status === 'not_showing' ? 'not_showing' : 'unknown',
            note: showing?.note || null,
            goingCount: goingMap[venue.id] || 0,
            recentUpdates: updatesByVenue[venue.id] || [],
          };
        });

        // Sort: showing first, then not_showing, then unknown
        const sorted = venuesWithStatus.sort((a, b) => {
          const statusOrder = { showing: 0, not_showing: 1, unknown: 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        });

        if (!cancelled) setVenues(sorted);
        
      } catch (err: any) {
        if (!cancelled) setErrorMsg(err?.message ?? "Failed to load bars for this match");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const matchLabel = matchData 
    ? `${matchData.home_team} vs ${matchData.away_team}`
    : matchId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const otherMatches = [
    { id: "epl-2026-02-08-manu-liv", label: "Man Utd vs Liverpool" },
    { id: "epl-2026-02-08-che-ars", label: "Chelsea vs Arsenal" },
    { id: "epl-2026-02-09-tot-mci", label: "Spurs vs Man City" },
  ].filter((m) => m.id !== matchId);

  const showingCount = venues.filter(v => v.status === 'showing').length;
  const notShowingCount = venues.filter(v => v.status === 'not_showing').length;
  const unknownCount = venues.filter(v => v.status === 'unknown').length;

  function getTimeAgo(timestamp: string): string {
    const now = new Date();
    const posted = new Date(timestamp);
    const diffMs = now.getTime() - posted.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to matches
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bars for This Match
        </h1>
        <p className="text-lg text-gray-600">{matchLabel}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-600">
          <span className="px-3 py-1 bg-green-50 text-green-700 rounded-full">
            {showingCount} showing
          </span>
          <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full">
            {notShowingCount} not showing
          </span>
          <span className="px-3 py-1 bg-gray-50 text-gray-700 rounded-full">
            {unknownCount} unknown
          </span>
        </div>

        {otherMatches.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Switch to:</span>
            {otherMatches.map((m) => (
              <Link key={m.id} href={`/results?match=${m.id}`}>
                <button className="bg-transparent text-gray-700 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 transition-all">
                  {m.label}
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading bars...</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-red-800 font-medium">Error: {errorMsg}</p>
        </div>
      )}

      {!loading && !errorMsg && (
        <div className="space-y-4">
          {venues.map((v) => {
            const barType =
              v.venue.bar_type === "club" && v.venue.club_name
                ? `Club-Specific: ${v.venue.club_name}`
                : "General Sports Bar";

            const badgeStyles = {
              showing: 'bg-green-100 text-green-700',
              not_showing: 'bg-red-100 text-red-700',
              unknown: 'bg-gray-100 text-gray-600',
            };

            const badgeText = {
              showing: 'Showing',
              not_showing: 'Not showing',
              unknown: 'No info',
            };

            return (
              <Link key={v.venue.id} href={`/venue/${v.venue.id}?match=${matchId}`} className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-md transition-all">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {v.venue.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeStyles[v.status]}`}>
                        {badgeText[v.status]}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">{v.venue.neighborhood}</p>

                    <div className="flex flex-wrap items-center gap-3 text-sm mb-3">
                      <span className="text-gray-500">{barType}</span>
                      {v.goingCount > 0 && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span className="font-medium text-gray-700">
                            {v.goingCount} {v.goingCount === 1 ? "person" : "people"} going
                          </span>
                        </>
                      )}
                    </div>

                    {/* Recent Updates Preview */}
                    {v.recentUpdates.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {v.recentUpdates.map((update) => (
                          <div key={update.id} className="flex items-start gap-2 text-sm">
                            <span className="text-gray-400 mt-0.5">💬</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-700 line-clamp-1">"{update.message}"</p>
                              <p className="text-xs text-gray-500">
                                {update.username} • {getTimeAgo(update.created_at)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {v.note && (
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-sm text-blue-900">{v.note}</p>
                      </div>
                    )}
                  </div>

                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1"
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
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  );
}