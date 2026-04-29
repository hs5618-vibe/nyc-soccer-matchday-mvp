"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";
import { fetchVenueById, type Venue } from "@/lib/venues";
import { fetchMatchById, formatMatchTime, type Match } from "@/lib/matches";
import { isVenueAdmin, getVenueClaimStatus } from "@/lib/venueAdmin";
import ClaimVenueModal from "@/components/ClaimVenueModal";

type Update = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
};

function alertSupabaseError(context: string, err: any) {
  const msg =
    err?.message ||
    err?.error_description ||
    (typeof err === "string" ? err : "Unknown error");

  const code = err?.code ? `\nCode: ${err.code}` : "";
  const hint = err?.hint ? `\nHint: ${err.hint}` : "";
  const details = err?.details ? `\nDetails: ${err.details}` : "";

  console.error(`[${context}]`, err);
  alert(`${context}\n\n${msg}${code}${details}${hint}`);
}

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
  const [goingLoading, setGoingLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  // Claim modal state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimStatus, setClaimStatus] = useState<any>(null);
  const [isClaimed, setIsClaimed] = useState(false);
  const [bio, setBio] = useState<string>("");
  const [editingBio, setEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState("");
  const [savingBio, setSavingBio] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('savedBars') || '[]');
    setBookmarked(saved.includes(venueId));
  }, [venueId]);

  function toggleBookmark() {
    const saved = JSON.parse(localStorage.getItem('savedBars') || '[]');
    let updated;
    if (bookmarked) {
      updated = saved.filter((id: string) => id !== venueId);
    } else {
      updated = [...saved, venueId];
    }
    localStorage.setItem('savedBars', JSON.stringify(updated));
    setBookmarked(!bookmarked);
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [venueData, matchData] = await Promise.all([
          fetchVenueById(venueId),
          matchId ? fetchMatchById(matchId) : Promise.resolve(null),
        ]);

        setVenue(venueData);
        setMatch(matchData);
        if (venueData) setBio((venueData as any).bio || "");

        if (venueData && matchId) {
          await loadUpdates();
          await loadGoingStatus();
        }
      } finally {
        setLoading(false);
      }
    }

    async function checkAuth() {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("auth.getUser error:", error);
      }

      setUser(user);

      if (user && venueId) {
        const ownerStatus = await isVenueAdmin(user.id, venueId);
        setIsOwner(ownerStatus);

        // Check claim status
        const status = await getVenueClaimStatus(user.id, venueId);
        setClaimStatus(status);
      } else {
        setIsOwner(false);
        setClaimStatus(null);
      }

      // Check if venue is already claimed by anyone
      const { data: existingAdmin } = await supabase
        .from("venue_admins")
        .select("venue_id")
        .eq("venue_id", venueId)
        .maybeSingle();
      setIsClaimed(!!existingAdmin);
    }

    loadData();
    checkAuth();
  }, [venueId, matchId]);

  async function loadUpdates() {
    if (!matchId) return;

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

    setUpdates((data || []) as Update[]);
  }

  async function loadGoingStatus() {
    if (!matchId) return;

    const { count, error: countError } = await supabase
      .from("going")
      .select("*", { count: "exact", head: true })
      .eq("venue_id", venueId)
      .eq("match_id", matchId);

    if (countError) {
      console.error("Error counting going:", countError);
      setGoingCount(0);
    } else {
      setGoingCount(count || 0);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

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
      console.error("Error loading going status:", error);
      setGoing(false);
      return;
    }

    setGoing(!!data);
  }

  async function handleGoing() {
    if (!matchId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please sign in to mark yourself as going");
      return;
    }

    if (goingLoading) return;
    setGoingLoading(true);

    const nextGoing = !going;
    setGoing(nextGoing);
    setGoingCount((prev) => Math.max(0, prev + (nextGoing ? 1 : -1)));

    try {
      if (nextGoing) {
        const { error } = await supabase.from("going").upsert(
          {
            venue_id: venueId,
            match_id: matchId,
            user_id: user.id,
          },
          { onConflict: "venue_id,match_id,user_id" }
        );
        if (error) throw error;

        // Also mark as interested in the match
        await supabase.from("interested").upsert(
          { match_id: matchId, user_id: user.id },
          { onConflict: "match_id,user_id" }
        );
      } else {
        const { error } = await supabase
          .from("going")
          .delete()
          .eq("venue_id", venueId)
          .eq("match_id", matchId)
          .eq("user_id", user.id);

        if (error) throw error;
      }

      await loadGoingStatus();
    } catch (err: any) {
      setGoing(!nextGoing);
      setGoingCount((prev) => Math.max(0, prev + (!nextGoing ? 1 : -1)));

      alertSupabaseError("Failed to update going status.", err);
    } finally {
      setGoingLoading(false);
    }
  }

  async function handlePostUpdate() {
    if (!user || !matchId || !newUpdate.trim()) return;

    const content = newUpdate.trim();

    const { error } = await supabase.from("updates").insert({
      venue_id: venueId,
      match_id: matchId,
      content,
      user_id: user.id,
    });

    if (error) {
      alertSupabaseError("Failed to post update.", error);
      return;
    }

    setNewUpdate("");
    await loadUpdates();
  }

  async function handleSaveBio() {
    setSavingBio(true);
    const { error } = await supabase
      .from("venues")
      .update({ bio: bioInput })
      .eq("id", venueId);

    if (error) {
      alert("Failed to save bio.");
    } else {
      setBio(bioInput);
      setEditingBio(false);
    }
    setSavingBio(false);
  }
  function handleClaimSuccess() {
    setShowClaimModal(false);
    alert("Claim submitted! We'll review it and get back to you via email.");
    
    // Reload claim status
    if (user) {
      getVenueClaimStatus(user.id, venueId).then(setClaimStatus);
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
        <Link
          href={matchId ? `/results?match=${matchId}` : "/"}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Link>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-4xl font-black text-white">{venue.name}</h1>
            <button
              onClick={toggleBookmark}
              className={`flex-shrink-0 ml-2 transition-all hover:scale-110 p-1 ${bookmarked ? 'text-pink-400' : 'text-gray-500 hover:text-pink-400'}`}
              title={bookmarked ? "Remove from saved" : "Save this bar"}
            >
              <svg className="w-7 h-7" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            
            {/* FIFA Fan Zone Badge */}
            {venueId?.startsWith('wc-fan-zone') && (
              <div className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 px-3 py-1 rounded-full text-xs font-bold flex-shrink-0">
                🏆 Official FIFA Fan Zone
              </div>
            )}
            {/* Claim button - show if not owner and no pending claim */}
            {user && !isOwner && !claimStatus && !isClaimed && (
              <button
                onClick={() => setShowClaimModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-blue-700 transition-all flex-shrink-0"
              >
                Own this bar?
              </button>
            )}

            {/* Show pending status */}
            {claimStatus?.status === "pending" && (
              <div className="bg-yellow-600/20 border border-yellow-600/30 text-yellow-300 px-4 py-2 rounded-full text-sm font-bold flex-shrink-0">
                Claim pending review
              </div>
            )}

            {/* Show rejected status */}
            {claimStatus?.status === "rejected" && (
              <button
                onClick={() => setShowClaimModal(true)}
                className="bg-red-600/20 border border-red-600/30 text-red-300 px-4 py-2 rounded-full text-sm font-bold hover:bg-red-600/30 transition-all flex-shrink-0"
              >
                Claim rejected - Try again
              </button>
            )}
          </div>

          {/* Bio */}
          {(bio || isOwner) && (
            <div className="mb-4">
              {!editingBio ? (
                <div className="flex items-start gap-2">
                  <p className="text-gray-300 text-sm flex-1">
                    {bio || <span className="text-gray-500 italic">No description yet</span>}
                  </p>
                  {isOwner && (
                    <button
                      onClick={() => { setEditingBio(true); setBioInput(bio); }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0"
                    >
                      {bio ? "Edit" : "Add description"}
                    </button>
                  )}
                </div>
              ) : (
                <div>
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value.slice(0, 500))}
                    placeholder="Tell fans about your bar — atmosphere, screens, specials..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 text-sm"
                    rows={3}
                    maxLength={500}
                  />
                  <p className="text-xs text-gray-500 text-right mb-2">{bioInput.length}/500</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveBio}
                      disabled={savingBio}
                      className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all"
                    >
                      {savingBio ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingBio(false)}
                      className="bg-white/10 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-white/20 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Supported Teams */}
          {(venue as any).supported_teams?.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {(venue as any).supported_teams.map((team: string) => (
                <span
                  key={team}
                  className="bg-white/10 border border-white/20 text-white text-xs font-bold px-3 py-1 rounded-full"
                >
                  {team}
                </span>
              ))}
            </div>
          )}
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
          {(venue as any).instagram && (
              <div className="flex items-center gap-2">
                <span>•</span>
                <a
                  href={`https://www.instagram.com/${(venue as any).instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pink-400 transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  @{(venue as any).instagram}
                </a>
              </div>
            )}
          </div>

          {match && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={handleGoing}
                disabled={goingLoading}
                className={`px-6 py-3 rounded-full font-bold transition-all ${
                  going
                    ? "bg-blue-600 text-white"
                    : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                } ${goingLoading ? "opacity-70 cursor-not-allowed" : ""}`}
              >
                {going ? "✓ I'm going" : "Mark as going"}
              </button>

              <span className="text-gray-400 text-sm">
                {goingCount} {goingCount === 1 ? "person" : "people"} going
              </span>
            </div>
          )}
        </div>

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

            <div className="mt-4 text-sm text-gray-400 text-center">{formatMatchTime(match.kickoff_time)}</div>
          </div>
        )}

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
          <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">Live Updates</h2>

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

          {!user && match && <p className="text-gray-400 text-sm mb-4">Sign in to see live updates from this bar</p>}

          {user && updates.length === 0 && <p className="text-gray-400 text-center py-8">No updates yet</p>}

          {user && (
            <div className="space-y-3">
              {updates.map((update) => (
                <div key={update.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">Staff</span>
                    <span className="text-xs text-gray-500">{new Date(update.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-white">{update.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Claim Modal */}
      {showClaimModal && venue && (
        <ClaimVenueModal
          venueId={venue.id}
          venueName={venue.name}
          onClose={() => setShowClaimModal(false)}
          onSuccess={handleClaimSuccess}
        />
      )}
    </div>
  );
}
