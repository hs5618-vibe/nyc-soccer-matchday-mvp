"use client";

import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchGoingCount, insertGoing, hasUserGone } from "@/lib/going";
import { fetchVenueById } from "@/lib/venues";
import { supabase } from "@/lib/supabaseClient";

type Venue = {
  id: string;
  name: string;
  neighborhood: string;
  bar_type: string;
  club_name: string | null;
};

type Update = {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
};

export default function VenuePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";
  const matchId = searchParams.get("match") || "man-utd-v-liverpool";
  
  const [venue, setVenue] = useState<Venue | null>(null);
  const [userAlreadyGoing, setUserAlreadyGoing] = useState(false);
  const [goingCount, setGoingCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updates, setUpdates] = useState<Update[]>([]);
  const [updateMessage, setUpdateMessage] = useState("");
  const [postingUpdate, setPostingUpdate] = useState(false);

  useEffect(() => {
    async function loadVenueAndGoingData() {
      if (!id) return;

      const venueData = await fetchVenueById(id);
      setVenue(venueData);
      setLoading(false);

      if (!venueData) return;

      const count = await fetchGoingCount({ matchId, venueId: venueData.id });
      setGoingCount(count);

      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);

      if (user?.id) {
        const alreadyGoing = await hasUserGone({ matchId, venueId: venueData.id, userId: user.id });
        setUserAlreadyGoing(alreadyGoing);
      }

      await loadUpdates(venueData.id);
    }

    loadVenueAndGoingData();
  }, [id, matchId]);

  async function loadUpdates(venueId: string) {
    const { data, error } = await supabase
      .from("updates")
      .select("id, message, created_at, user_id")
      .eq("match_id", matchId)
      .eq("venue_id", venueId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Error fetching updates:", error);
      return;
    }

    setUpdates(data || []);
  }

  async function handlePostUpdate() {
    if (!userId || !venue) return;

    setPostingUpdate(true);

    const { error } = await supabase
      .from("updates")
      .insert({
        match_id: matchId,
        venue_id: venue.id,
        user_id: userId,
        message: updateMessage,
      });

    if (error) {
      console.error("Error posting update:", error);
      alert("Failed to post update");
    } else {
      setUpdateMessage("");
      await loadUpdates(venue.id);
    }

    setPostingUpdate(false);
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading venue...</p>
        </div>
      </div>
    );
  }

  if (!venue) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Venue not found</h1>
          <p className="text-gray-600 mb-6">Sorry, we couldn't find that venue.</p>
          <Link href={`/results?match=${matchId}`}>
            <button className="bg-gray-100 text-gray-900 px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-gray-200 transition-all">
              ← Back to results
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const barTypeDisplay =
    venue.bar_type === "club" && venue.club_name
      ? `Club-Specific: ${venue.club_name}`
      : "General Sports Bar";

  const handleGoing = async () => {
    if (!userId) {
      router.push("/login");
      return;
    }

    setGoingCount((prev) => prev + 1);
    setButtonDisabled(true);

    try {
      await insertGoing({ matchId, venueId: venue.id, userId });
      setUserAlreadyGoing(true);
      const refreshedCount = await fetchGoingCount({ matchId, venueId: venue.id });
      setGoingCount(refreshedCount);
    } catch (error) {
      console.error("Error marking as going:", error);
      setGoingCount((prev) => prev - 1);
      setButtonDisabled(false);
    }
  };

  const getButtonLabel = () => {
    if (!userId) return "Log in to mark going";
    if (userAlreadyGoing) return "You're going ✅";
    return "I'm going";
  };

  const isButtonDisabled = buttonDisabled || userAlreadyGoing;

  const matchLabel = matchId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      
      <Link 
        href={`/results?match=${matchId}`} 
        className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to results
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{venue.name}</h1>
        <p className="text-lg text-gray-600 mb-3">{venue.neighborhood}</p>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
          {barTypeDisplay}
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-500 mb-1">Today's Match</p>
            <p className="font-semibold text-gray-900">{matchLabel}</p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4 mb-6">
          <p className="text-2xl font-bold text-gray-900">
            {goingCount} {goingCount === 1 ? "person" : "people"} going
          </p>
        </div>

        <button
          onClick={handleGoing}
          disabled={isButtonDisabled}
          className="w-full bg-blue-600 text-white px-6 py-3 text-base font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {getButtonLabel()}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Live Updates</h2>
          <p className="mt-1 text-sm text-gray-500">See what fans are saying</p>
        </div>

        {userId ? (
          <div className="mb-6">
            <textarea
              value={updateMessage}
              onChange={(e) => setUpdateMessage(e.target.value)}
              placeholder="Share what's happening at the bar..."
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
            <div className="mt-3">
              <button
                onClick={handlePostUpdate}
                disabled={!updateMessage.trim() || postingUpdate}
                className="bg-blue-600 text-white px-4 py-2.5 text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {postingUpdate ? "Posting..." : "Post update"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <p className="text-sm text-gray-600">
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Log in
              </Link>{" "}
              to post updates and join the conversation
            </p>
          </div>
        )}

        <div className="space-y-4">
          {updates.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No updates yet. Be the first to post!</p>
            </div>
          )}
          {updates.map((update) => (
            <div key={update.id} className="border-l-4 border-blue-600 pl-4 py-2">
              <p className="text-gray-900 mb-1">{update.message}</p>
              <p className="text-xs text-gray-500">
                {new Date(update.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}