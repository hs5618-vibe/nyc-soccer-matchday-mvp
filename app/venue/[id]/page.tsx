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
      <main className="p-6 font-sans max-w-2xl">
        <p className="text-gray-600">Loading...</p>
      </main>
    );
  }

  if (!venue) {
    return (
      <main className="p-6 font-sans max-w-2xl">
        <h1 className="text-2xl font-bold">Venue not found</h1>
        <p className="mt-4 text-gray-600">Sorry, we couldn't find that venue.</p>
        <Link href={`/results?match=${matchId}`} className="mt-4 inline-block text-blue-600 underline">
          ← Back to results
        </Link>
      </main>
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

  return (
    <main className="p-6 font-sans max-w-2xl">
      <Link href={`/results?match=${matchId}`} className="text-blue-600 text-sm underline">
        ← Back to results
      </Link>

      <h1 className="text-3xl font-bold mt-4">{venue.name}</h1>
      <p className="text-gray-600 mt-1">{venue.neighborhood}</p>
      <p className="text-sm text-gray-500 mt-2">{barTypeDisplay}</p>

      <div className="mt-8 border-t pt-6">
        <h2 className="font-semibold text-lg">Today's Match</h2>
        <p className="mt-2">Manchester United vs Liverpool — Sat 3:00 PM</p>
      </div>

      <div className="mt-6">
        <p className="font-medium">{goingCount} going</p>
      </div>

      <button
        onClick={handleGoing}
        disabled={isButtonDisabled}
        className="mt-6 bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {getButtonLabel()}
      </button>

      <div className="mt-8 border-t pt-6">
        <h2 className="font-semibold text-lg">Live updates</h2>

        {userId ? (
          <div className="mt-4">
            <textarea
              value={updateMessage}
              onChange={(e) => setUpdateMessage(e.target.value)}
              placeholder="Share an update..."
              className="w-full border rounded px-3 py-2 text-sm"
              rows={3}
            />
            <button
              onClick={handlePostUpdate}
              disabled={!updateMessage.trim() || postingUpdate}
              className="mt-2 bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {postingUpdate ? "Posting..." : "Post update"}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-gray-600">
            <Link href="/login" className="text-blue-600 underline">
              Log in
            </Link>{" "}
            to post an update
          </p>
        )}

        <div className="mt-6 space-y-3">
          {updates.length === 0 && (
            <p className="text-sm text-gray-500">No updates yet for this match.</p>
          )}
          {updates.map((update) => (
            <div key={update.id} className="border-l-2 border-gray-300 pl-3">
              <p className="text-sm">{update.message}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(update.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}