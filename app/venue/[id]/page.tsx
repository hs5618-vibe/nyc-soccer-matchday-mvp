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
    }

    loadVenueAndGoingData();
  }, [id, matchId]);

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
    </main>
  );
}