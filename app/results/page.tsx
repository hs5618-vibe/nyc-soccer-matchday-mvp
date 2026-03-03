"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchMatchById, formatMatchTime, type Match } from "@/lib/matches";
import { fetchVenuesByMatch, fetchAllVenues, type Venue as BaseVenue } from "@/lib/venues";

type VenueWithMeta = BaseVenue & {
  is_showing: boolean;
  going_count: number;
};

type SortMode = "default" | "near";
type UserLoc = { lat: number; lng: number };

function haversineMiles(a: UserLoc, b: UserLoc) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R_km = 6371;

  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;

  const km = 2 * R_km * Math.asin(Math.sqrt(h));
  const miles = km * 0.621371;

  return miles;
}

function formatMiles(miles: number) {
  if (!Number.isFinite(miles)) return "";
  if (miles < 0.1) return "<0.1 mi";
  return `${miles.toFixed(1)} mi`;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");

  const [match, setMatch] = useState<Match | null>(null);
  const [venues, setVenues] = useState<VenueWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Near-me sorting
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [userLoc, setUserLoc] = useState<UserLoc | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!matchId) {
        setMatch(null);
        setVenues([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const [matchData, showingVenues, allVenues, goingRows] = await Promise.all([
        fetchMatchById(matchId),
        fetchVenuesByMatch(matchId),
        fetchAllVenues(),
        supabase.from("going").select("venue_id").eq("match_id", matchId),
      ]);

      setMatch(matchData);

      const showingIds = new Set((showingVenues || []).map((v) => v.id));

      const counts: Record<string, number> = {};
      (goingRows.data || []).forEach((r: any) => {
        const vid = String(r.venue_id);
        counts[vid] = (counts[vid] || 0) + 1;
      });

      const merged: VenueWithMeta[] = (allVenues || []).map((v) => ({
        ...v,
        is_showing: showingIds.has(v.id),
        going_count: counts[v.id] || 0,
      }));

      setVenues(merged);
      setLoading(false);
    }

    load();
  }, [matchId]);

  const stats = useMemo(() => {
    const showing = venues.filter((v) => v.is_showing).length;
    const notConfirmed = venues.length - showing;
    return { showing, notConfirmed };
  }, [venues]);

  const venuesSorted = useMemo(() => {
    const list = [...venues];

    const distanceFor = (v: VenueWithMeta) => {
      if (!userLoc) return Number.POSITIVE_INFINITY;
      if (v.latitude == null || v.longitude == null) return Number.POSITIVE_INFINITY;
      return haversineMiles(userLoc, { lat: v.latitude, lng: v.longitude });
    };

    if (sortMode === "near" && userLoc) {
      list.sort((a, b) => {
        // Showing first
        if (a.is_showing !== b.is_showing) return a.is_showing ? -1 : 1;

        const da = distanceFor(a);
        const db = distanceFor(b);
        if (da !== db) return da - db;

        // Tie-breakers
        if (a.going_count !== b.going_count) return b.going_count - a.going_count;
        return a.name.localeCompare(b.name);
      });
      return list;
    }

    // Default sort: showing first, then going_count desc, then name
    list.sort((a, b) => {
      if (a.is_showing !== b.is_showing) return a.is_showing ? -1 : 1;
      if (a.going_count !== b.going_count) return b.going_count - a.going_count;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [venues, sortMode, userLoc]);

  const requestLocation = async () => {
    setLocError(null);

    if (typeof window === "undefined") return;

    if (!("geolocation" in navigator)) {
      setLocError("Location not supported on this device/browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocError(null);
        setSortMode("near");
      },
      (err) => {
        // Common: user denied, unavailable, timeout
        setLocError(err.message || "Could not get your location.");
        setUserLoc(null);
        setSortMode("default");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  };

  const toggleNearMe = async () => {
    if (sortMode === "near") {
      setSortMode("default");
      return;
    }
    // Turning on:
    if (userLoc) {
      setSortMode("near");
      return;
    }
    await requestLocation();
  };

  const distanceLabel = (v: VenueWithMeta) => {
    if (sortMode !== "near" || !userLoc) return null;
    if (v.latitude == null || v.longitude == null) return null;
    const miles = haversineMiles(userLoc, { lat: v.latitude, lng: v.longitude });
    return formatMiles(miles);
  };

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

  if (!matchId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">No match selected</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to matches
          </Link>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Match not found</p>
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
          href="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to matches
        </Link>

        {/* Match Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            {match.league_emblem && (
              <img
                src={match.league_emblem}
                alt={match.league}
                className={`h-6 sm:h-8 w-auto object-contain ${
                  match.league === "Premier League" ? "brightness-0 invert" : ""
                }`}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            )}
            <span className="text-xs sm:text-sm text-gray-400 font-semibold">{match.league}</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className="flex flex-col items-center flex-1">
              {match.home_team_crest && (
                <div className="w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center mb-3 sm:mb-4">
                  <img src={match.home_team_crest} alt={match.home_team} className="w-full h-full object-contain" />
                </div>
              )}
              <span className="font-bold text-lg sm:text-2xl text-white text-center break-words px-2">
                {match.home_team}
              </span>
            </div>

            <div className="text-gray-500 font-bold text-2xl sm:text-3xl px-4 sm:px-8 text-center flex-shrink-0">
              vs
            </div>

            <div className="flex flex-col items-center flex-1">
              {match.away_team_crest && (
                <div className="w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center mb-3 sm:mb-4">
                  <img src={match.away_team_crest} alt={match.away_team} className="w-full h-full object-contain" />
                </div>
              )}
              <span className="font-bold text-lg sm:text-2xl text-white text-center break-words px-2">
                {match.away_team}
              </span>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 sm:pt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-base sm:text-lg font-semibold">{formatMatchTime(match.kickoff_time)}</span>
            </div>
          </div>
        </div>

        {/* Bars Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-wide">Sports Bars</h2>

            <div className="flex items-center gap-3">
              {/* Near me toggle */}
              <button
                type="button"
                onClick={toggleNearMe}
                className={`text-sm font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                  sortMode === "near"
                    ? "bg-white/15 border-white/30 text-white"
                    : "bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                Near me
              </button>

              <span className="text-sm text-gray-400">
                {stats.showing} showing • {stats.notConfirmed} not confirmed
              </span>
            </div>
          </div>

          {locError && (
            <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-2xl px-4 py-3 text-sm">
              {locError}
            </div>
          )}

          {venuesSorted.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 text-center border border-white/10">
              <p className="text-gray-400 text-lg mb-4">No bars available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {venuesSorted.map((venue) => {
                const dist = distanceLabel(venue);

                return (
                  <Link
                    key={venue.id}
                    href={`/venue/${venue.id}?match=${matchId}`}
                    className={`block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition-all group ${
                      venue.is_showing ? "" : "opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 min-w-0">
                          <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors truncate">
                            {venue.name}
                          </h3>
                          {venue.is_showing && (
                            <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                              SHOWING
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="truncate">{venue.neighborhood}</span>
                          </span>

                          {dist && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="font-semibold text-gray-200">{dist}</span>
                            </>
                          )}

                          {venue.address && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="truncate">{venue.address}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Going count on the right */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">{venue.going_count}</div>
                          <div className="text-xs text-gray-400">going</div>
                        </div>
                        <svg
                          className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ResultsContent />
    </Suspense>
  );
}