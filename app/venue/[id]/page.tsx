"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { fetchVenueById, type Venue } from "@/lib/venues";
import { fetchMatchById, formatMatchTime, type Match } from "@/lib/matches";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { isVenueAdmin } from "@/lib/venueAdmin";
import { toggleUpvote, getUpvotesForUpdates, getUserUpvotes } from "@/lib/upvotes";

type UpdateRow = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
};

type Update = UpdateRow & {
  upvote_count: number;
  user_has_upvoted: boolean;
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
  const [upvotingId, setUpvotingId] = useState<string | null>(null);

  useEffect(() => {
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

    async function loadData() {
      const [venueData, matchData] = await Promise.all([
        fetchVenueById(venueId),
        matchId ? fetchMatchById(matchId) : Promise.resolve(null),
      ]);

      setVenue(venueData);
      setMatch(matchData);

      // Load going + updates only if we have a venue + match context
      if (venueData && matchId) {
        await loadGoingStatus();
        await loadUpdates();
      }

      setLoading(false);
    }

    loadData();
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Re-check auth + reload updates so upvote state reflects the new user
      checkAuth().then(() => {
        if (matchId) loadUpdates();
      });
    });

    return () => subscription.unsubscribe();
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
        setUpdates([]);
        return;
      }

      const rows = (data || []) as UpdateRow[];
      const updateIds = rows.map((r) => r.id);

      // Get counts for all updates
      const counts = await getUpvotesForUpdates(updateIds);

      // Get which updates current user has upvoted (if signed in)
      let userUpvotes = new Set<string>();
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        userUpvotes = await getUserUpvotes(currentUser.id, updateIds);
      }

      const enriched: Update[] = rows.map((r) => ({
        ...r,
        upvote_count: counts[r.id] ?? 0,
        user_has_upvoted: userUpvotes.has(r.id),
      }));

      setUpdates(enriched);
    } catch (err) {
      console.error("loadUpdates: Unexpected error:", err);
      setUpdates([]);
    }
  }

  async function loadGoingStatus() {
    if (!matchId) return;

    const { data: { user } } = await supabase.auth.getUser();

    const { count } = await supabase
      .from("going")
      .select("*", { count: "exact", head: true })
      .eq("venue_id", venueId)
      .eq("match_id", matchId);

    setGoingCount(count || 0);

    if (user) {
      const { data } = await supabase
        .from("going")
        .select("id")
        .eq("venue_id", venueId)
        .eq("match_id", matchId)
        .eq("user_id", user.id)
        .maybeSingle();

      setGoing(!!data);
    } else {
      setGoing(false);
    }
  }

  async function handlePostUpdate() {
    if (!user || !matchId || !newUpdate.trim()) return;

    const payload = {
      venue_id: venueId,
      match_id: matchId,
      content: newUpdate.trim(),
      user_id: user.id,
    };

    const { error } = await supabase.from("updates").insert(payload);

    if (error) {
      console.error("Failed to post update:", error);
      alert(`Failed to post update: ${error.message}`);
      return;
    }

    setNewUpdate("");
    await loadUpdates();
  }

  async function handleGoing() {
    if (!matchId || !venue) {
      alert("Pick a match first");
      return;
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      alert("Please sign in to mark yourself as going");
      return;
    }

    // Optimistic UI
    const nextGoing = !going;
    setGoing(nextGoing);
    setGoingCount((prev) => Math.max(0, prev + (nextGoing ? 1 : -1)));

    try {
      if (nextGoing) {
        const { error } = await supabase
          .from("going")
          .insert({ venue_id: venueId, match_id: matchId, user_id: currentUser.id });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("going")
          .delete()
          .eq("venue_id", venueId)
          .eq("match_id", matchId)
          .eq("user_id", currentUser.id);

        if (error) throw error;
      }
    } catch (err) {
      console.error("Error toggling going:", err);
      // rollback
      setGoing(!nextGoing);
      setGoingCount((prev) => Math.max(0, prev + (!nextGoing ? 1 : -1)));
      alert("Failed to update. Please try again.");
    }
  }

  async function handleUpvote(updateId: string) {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) {
      alert("Please sign in to upvote");
      return;
    }

    setUpvotingId(updateId);

    try {
      // optimistic toggle
      setUpdates((prev) =>
        prev.map((u) => {
          if (u.id !== updateId) return u;
          const nextUpvoted = !u.user_has_upvoted;
          return {
            ...u,
            user_has_upvoted: nextUpvoted,
            upvote_count: Math.max(0, u.upvote_count + (nextUpvoted ? 1 : -1)),
          };
        })
      );

      const res = await toggleUpvote(updateId, currentUser.id);

      // reconcile with server truth
      setUpdates((prev) =>
        prev.map((u) =>
          u.id === updateId
            ? { ...u, user_has_upvoted: res.upvoted, upvote_count: res.count }
            : u
        )
      );
    } catch (err) {
      console.error("Upvote failed:", err);
      // If it fails, reload to restore truth
      await loadUpdates();
      alert("Upvote failed. Please try again.");
    } finally {
      setUpvotingId(null);
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
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
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

          {/* Going Button */}
          {match && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={handleGoing}
                className={`px-6 py-3 rounded-full font-bold transition-all ${
                  going
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                }`}
              >
                {going ? "✓ I'm going" : "Mark as going"}
              </button>
              <span className="text-gray-400 text-sm">
                {goingCount} {goingCount === 1 ? "person" : "people"} going
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
              <span className="text-gray-500 font-bold text-sm sm:text-base flex-shrink-0 self-center">
                vs
              </span>
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

          {!user && match && (
            <p className="text-gray-400 text-sm mb-4">
              Sign in to upvote updates (you can still see them once posted)
            </p>
          )}

          {/* Empty states */}
          {updates.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No updates yet</p>
          ) : (
            <div className="space-y-3">
              {updates.map((update) => (
                <div key={update.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4">
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

                    {/* Upvote */}
                    <button
                      onClick={() => handleUpvote(update.id)}
                      disabled={!user || upvotingId === update.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold border transition-all flex-shrink-0 ${
                        update.user_has_upvoted
                          ? "bg-white/10 border-white/20 text-white"
                          : "bg-transparent border-white/10 text-gray-300 hover:border-white/20 hover:text-white"
                      } ${(!user || upvotingId === update.id) ? "opacity-60 cursor-not-allowed" : ""}`}
                      title={!user ? "Sign in to upvote" : "Upvote"}
                    >
                      <span>{update.user_has_upvoted ? "▲" : "△"}</span>
                      <span>{update.upvote_count}</span>
                    </button>
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