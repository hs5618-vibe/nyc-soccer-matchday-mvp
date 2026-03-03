"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { fetchVenueById, type Venue } from "@/lib/venues";
import { fetchMatchById, formatMatchTime, type Match } from "@/lib/matches";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { isVenueAdmin } from "@/lib/venueAdmin";

type Update = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
};

export default function VenuePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const venueId = params.id as string;
  const matchId = searchParams.get("match");

  const [venue, setVenue] = useState<Venue | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [newUpdate, setNewUpdate] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  const [going, setGoing] = useState(false);
  const [goingCount, setGoingCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [goingLoading, setGoingLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [venueData, matchData] = await Promise.all([
        fetchVenueById(venueId),
        matchId ? fetchMatchById(matchId) : Promise.resolve(null),
      ]);

      setVenue(venueData);
      setMatch(matchData);

      // Load going count even if user is logged out (so the UI always shows count)
      if (venueData && matchId) {
        await loadGoingStatus();
      }

      // Only load updates when there's a match selected
      if (venueData && matchId) {
        await loadUpdates();
      }

      setLoading(false);
    }

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user && venueId) {
        const ownerStatus = await isVenueAdmin(user.id, venueId);
        setIsOwner(ownerStatus);
      } else {
        setIsOwner(false);
      }
    }

    loadData();
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId, matchId]);

  async function loadUpdates() {
    if (!matchId) return;

    try {
      const { data, error } = await supabase
        .from("updates")
        .select("id, content, created_at, user_id")
        .eq("venue_id", venueId)
        .eq("match_id", matchId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading updates:", error);
        return;
      }

      setUpdates(data || []);
    } catch (err) {
      console.error("loadUpdates unexpected error:", err);
    }
  }

  async function loadGoingStatus() {
    if (!matchId) return;

    try {
      // 1) Count (works best if SELECT is allowed in RLS)
      const { count, error: countError } = await supabase
        .from("going")
        .select("*", { count: "exact", head: true })
        .eq("venue_id", venueId)
        .eq("match_id", matchId);

      if (countError) {
        console.error("Error fetching going count:", countError);
      } else {
        setGoingCount(count || 0);
      }

      // 2) Whether current user has "gone"
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setGoing(false);
        return;
      }

      const { data, error } = await supabase
        .from("going")
        .select("id")
        .eq("venue_id", venueId)
        .eq("match_id", matchId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        // If RLS blocks SELECT for users, you'll see this here
        console.error("Error checking if user is going:", error);
      }

      setGoing(!!data);
    } catch (err) {
      console.error("loadGoingStatus unexpected error:", err);
    }
  }

  async function handlePostUpdate() {
    if (!user || !matchId || !newUpdate.trim()) return;

    try {
      const { error } = await supabase
        .from("updates")
        .insert({
          venue_id: venueId,
          match_id: matchId,
          content: newUpdate.trim(),
          user_id: user.id,
        });

      if (error) throw error;

      setNewUpdate("");
      await loadUpdates();
    } catch (e: any) {
      console.error("Failed to post update:", e);
      alert(`Failed to post update: ${e?.message || "Unknown error"}`);
    }
  }

  async function handleGoing() {
    if (!matchId) return;

    if (!user) {
      alert("Please sign in to mark yourself as going");
      return;
    }

    if (goingLoading) return;

    setGoingLoading(true);

    try {
      if (going) {
        const { error } = await supabase
          .from("going")
          .delete()
          .eq("venue_id", venueId)
          .eq("match_id", matchId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("going")
          .insert({
            venue_id: venueId,
            match_id: matchId,
            user_id: user.id,
          });

        if (error) throw error;
      }

      await loadGoingStatus();
    } catch (e: any) {
      console.error("handleGoing failed:", e);
      alert(`Could not update going status: ${e?.message || "Unknown error"}`);
    } finally {
      setGoingLoading(false);
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

  if (!venue) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Venue not found</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to matches
          </Link>
        </div>
      </div>
    );
  }

  const peopleLabel = goingCount === 1 ? "person" : "people";

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <Link
          href={matchId ? `/results?match=${matchId}` : "/"}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        {/* Venue Header */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 mb-6">
          <h1 className="text-4xl font-black text-white mb-4">{venue.name}</h1>

          <div className="flex flex-wrap gap-4 text-gray-300 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{venue.neighborhood}</span>
            </div>

            {venue.address && (
              <div className="flex items-center gap-2">
                <span>•</span>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    venue.address + ", New York, NY"
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-400 transition-colors"
                >
                  {venue.address}
                </a>
              </div>
            )}
          </div>

          {/* Going Button + Count */}
          {matchId && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={handleGoing}
                disabled={going || goingLoading}
                className={`px-6 py-3 rounded-full font-bold transition-all ${
                  going
                    ? "bg-blue-600 text-white cursor-default"
                    : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                } ${goingLoading ? "opacity-60" : ""}`}
              >
                {going ? "✓ I'm going" : goingLoading ? "Saving..." : "Mark as going"}
              </button>

              <span className="inline-flex items-center rounded-full bg-white/10 border border-white/15 px-3 py-1 text-sm font-semibold text-gray-200">
                {goingCount} {peopleLabel} going
              </span>
            </div>
          )}
        </div>

        {/* Match Info */}
        {match && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">Match</h2>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {match.home_team_crest && (
                  <img
                    src={match.home_team_crest}
                    alt={match.home_team}
                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0"
                  />
                )}
                <span className="font-semibold text-white truncate">{match.home_team}</span>
              </div>

              <span className="text-gray-500 font-bold text-sm sm:text-base flex-shrink-0 self-center">vs</span>

              <div className="flex items-center gap-3 min-w-0 flex-1 sm:justify-end">
                <span className="font-semibold text-white truncate">{match.away_team}</span>
                {match.away_team_crest && (
                  <img
                    src={match.away_team_crest}
                    alt={match.away_team}
                    className="w-8 h-8 sm:w-10 sm:h-10 object-contain flex-shrink-0"
                  />
                )}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-400 text-center">
              {formatMatchTime(match.kickoff_time)}
            </div>
          </div>
        )}

        {/* Live Updates */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">Live Updates</h2>

          {/* Post Update (Owner Only) */}
          {isOwner && user && match && (
            <div className="mb-6 p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
              <p className="text-sm text-blue-300 mb-3 font-semibold">Bar staff can post updates</p>
              <textarea
                value={newUpdate}
                onChange={(e) => setNewUpdate(e.target.value)}
                placeholder="Post an update (e.g., 'Great atmosphere!', 'Food specials today')"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                rows={3}
              />
              <button
                onClick={handlePostUpdate}
                disabled={!newUpdate.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-full font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Post Update
              </button>
            </div>
          )}

          {!user && matchId && (
            <p className="text-gray-400 text-sm mb-4">
              Sign in to see live updates from this bar
            </p>
          )}

          {user && updates.length === 0 && (
            <p className="text-gray-400 text-center py-8">No updates yet</p>
          )}

          {user && (
            <div className="space-y-3">
              {updates.map((update) => (
                <div key={update.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">
                          Staff
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(update.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white">{update.content}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}