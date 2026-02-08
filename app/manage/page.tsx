"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { getUserVenues, type UserVenue } from "@/lib/venueAdmin";
import { fetchUpcomingMatches, formatMatchTime, type Match } from "@/lib/matches";

type ShowingStatus = {
  [matchId: string]: {
    showing: boolean;
    note: string;
  };
};

export default function ManagePage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [venues, setVenues] = useState<UserVenue[]>([]);
  const [selectedVenueId, setSelectedVenueId] = useState<string>("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [showings, setShowings] = useState<ShowingStatus>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);
      
      const userVenues = await getUserVenues(user.id);
      
      if (userVenues.length === 0) {
        setLoading(false);
        return;
      }

      setVenues(userVenues);
      setSelectedVenueId(userVenues[0].venue_id);
      
      const upcomingMatches = await fetchUpcomingMatches();
      setMatches(upcomingMatches);

      await loadShowings(userVenues[0].venue_id, upcomingMatches);
      
      setLoading(false);
    }

    checkAuth();
  }, [router]);

  async function loadShowings(venueId: string, matchList: Match[]) {
    const { data, error } = await supabase
      .from("showings")
      .select("match_id, status, note")
      .eq("venue_id", venueId);

    if (error) {
      console.error("Error loading showings:", error);
      return;
    }

    const showingsMap: ShowingStatus = {};
    matchList.forEach(match => {
      const existing = data?.find(s => s.match_id === match.id);
      showingsMap[match.id] = {
        showing: existing?.status === "showing",
        note: existing?.note || "",
      };
    });

    setShowings(showingsMap);
  }

  async function handleVenueChange(venueId: string) {
    setSelectedVenueId(venueId);
    await loadShowings(venueId, matches);
  }

  async function toggleShowing(matchId: string) {
    setShowings(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        showing: !prev[matchId].showing,
      },
    }));
  }

  async function updateNote(matchId: string, note: string) {
    setShowings(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        note,
      },
    }));
  }

  async function saveMatch(matchId: string) {
    setSaving(true);
    const showing = showings[matchId];

    const { error } = await supabase
      .from("showings")
      .upsert({
        match_id: matchId,
        venue_id: selectedVenueId,
        status: showing.showing ? "showing" : "not_showing",
        note: showing.note || null,
      }, {
        onConflict: "match_id,venue_id",
      });

    if (error) {
      console.error("Error saving:", error);
      alert("Failed to save");
    } else {
      alert("Saved!");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (venues.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">No Venues Yet</h1>
          <p className="text-gray-600 mb-6">
            You haven't claimed any venues. Find your bar and claim it!
          </p>
          <Link href="/">
            <button className="bg-blue-600 text-white px-6 py-3 text-base font-medium rounded-lg hover:bg-blue-700 transition-all">
              Browse Venues
            </button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedVenue = venues.find(v => v.venue_id === selectedVenueId)?.venues;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Manage Your Venue
        </h1>
        <p className="text-lg text-gray-600">
          Update which matches you're showing
        </p>
      </div>

      {venues.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Venue
          </label>
          <select
            value={selectedVenueId}
            onChange={(e) => handleVenueChange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {venues.map(v => (
              <option key={v.venue_id} value={v.venue_id}>
                {v.venues?.name} - {v.venues?.neighborhood}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedVenue && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-1">
            {selectedVenue.name}
          </h2>
          <p className="text-gray-600">{selectedVenue.neighborhood}</p>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Upcoming Matches</h2>

        {matches.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-600">No upcoming matches</p>
          </div>
        ) : (
          matches.map(match => (
            <div key={match.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg mb-1">
                    {match.home_team} vs {match.away_team}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {formatMatchTime(match.kickoff_time)}
                  </p>
                </div>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showings[match.id]?.showing || false}
                    onChange={() => toggleShowing(match.id)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    We're showing this
                  </span>
                </label>
              </div>

              {showings[match.id]?.showing && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Note for fans (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., Arrive early, sound will be on"
                    value={showings[match.id]?.note || ""}
                    onChange={(e) => updateNote(match.id, e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              <button
                onClick={() => saveMatch(match.id)}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}