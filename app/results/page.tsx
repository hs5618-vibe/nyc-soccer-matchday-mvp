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
  distance_m?: number | null;
};

type LatLng = { lat: number; lon: number };

function haversineMeters(a: LatLng, b: LatLng) {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;

  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);

  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const s1 = Math.sin(dLat / 2) ** 2;
  const s2 = Math.sin(dLon / 2) ** 2;

  const h = s1 + Math.cos(lat1) * Math.cos(lat2) * s2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function formatDistance(m?: number | null) {
  if (m == null) return null;
  const miles = m / 1609.344;
  if (miles < 0.1) return "<0.1 mi";
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");

  const [match, setMatch] = useState<Match | null>(null);
  const [venues, setVenues] = useState<VenueWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Near-me UX
  const [sortByDistance, setSortByDistance] = useState(false);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

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
        distance_m: null,
      }));

      setVenues(merged);
      setLoading(false);
    }

    load();
  }, [matchId]);

  // Recompute distances + sort whenever origin or toggle changes
  const sortedVenues = useMemo(() => {
    const copy = [...venues];

    // compute distances if possible
    if (sortByDistance && origin) {
      for (const v of copy) {
        if (v.latitude != null && v.longitude != null) {
          v.distance_m = haversineMeters(origin, { lat: v.latitude, lon: v.longitude });
        } else {
          v.distance_m = null;
        }
      }

      // sort: showing first (keep your UX), then distance (known first), then going_count, then name
      copy.sort((a, b) => {
        if (a.is_showing !== b.is_showing) return a.is_showing ? -1 : 1;

        const ad = a.distance_m;
        const bd = b.distance_m;
        const aHas = ad != null;
        const bHas = bd != null;

        if (aHas && bHas && ad !== bd) return ad! - bd!;
        if (aHas !== bHas) return aHas ? -1 : 1;

        if (a.going_count !== b.going_count) return b.going_count - a.going_count;
        return a.name.localeCompare(b.name);
      });

      return copy;
    }

    // default sort (your existing logic)
    copy.sort((a, b) => {
      if (a.is_showing !== b.is_showing) return a.is_showing ? -1 : 1;
      if (a.going_count !== b.going_count) return b.going_count - a.going_count;
      return a.name.localeCompare(b.name);
    });

    return copy;
  }, [venues, sortByDistance, origin]);

  const stats = useMemo(() => {
    const showing = sortedVenues.filter((v) => v.is_showing).length;
    const notConfirmed = sortedVenues.length - showing;
    return { showing, notConfirmed };
  }, [sortedVenues]);

  async function useMyLocation() {
    setGeoStatus(null);

    if (!navigator.geolocation) {
      setGeoStatus("Geolocation not supported in this browser.");
      return;
    }

    setGeoLoading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setOrigin({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setGeoStatus("Using your current location.");
        setSortByDistance(true);
        setGeoLoading(false);
      },
      (err) => {
        setGeoStatus(err.message || "Could not get location.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }

  async function geocodeAddress() {
    const q = addressInput.trim();
    if (!q) return;

    setGeoLoading(true);
    setGeoStatus(null);

    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      const json = await res.json();

      if (!res.ok) {
        setGeoStatus(json?.error || "Could not geocode address.");
        setGeoLoading(false);
        return;
      }

      if (!json?.result) {
        setGeoStatus("No results found for that address.");
        setGeoLoading(false);
        return;
      }

      setOrigin({ lat: json.result.lat, lon: json.result.lon });
      setGeoStatus(json.result.display_name ? `Using: ${json.result.display_name}` : "Using entered address.");
      setSortByDistance(true);
    } catch {
      setGeoStatus("Geocoding failed.");
    } finally {
      setGeoLoading(false);
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
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8 mb-6">
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

        {/* Near me controls */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-4 sm:p-5 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-200">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={sortByDistance}
                onChange={(e) => setSortByDistance(e.target.checked)}
              />
              Sort by distance (near me)
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={useMyLocation}
                disabled={geoLoading}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-sm text-white transition disabled:opacity-50"
              >
                {geoLoading ? "Working..." : "Use my location"}
              </button>
            </div>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row gap-2">
            <input
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Or enter an address (e.g., 200 W 4th St, NYC)"
              className="flex-1 px-3 py-2 rounded-xl bg-black/30 border border-white/10 text-sm text-white placeholder:text-gray-500"
            />
            <button
              onClick={geocodeAddress}
              disabled={geoLoading || !addressInput.trim()}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm text-white transition disabled:opacity-50"
            >
              Use address
            </button>
          </div>

          {geoStatus && <div className="mt-2 text-xs text-gray-400">{geoStatus}</div>}
          {sortByDistance && !origin && <div className="mt-2 text-xs text-gray-500">Tip: click “Use my location” or enter an address.</div>}
        </div>

        {/* Bars Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-wide">Sports Bars</h2>
            <span className="text-sm text-gray-400">
              {stats.showing} showing • {stats.notConfirmed} not confirmed
            </span>
          </div>

          {sortedVenues.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 text-center border border-white/10">
              <p className="text-gray-400 text-lg mb-4">No bars available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedVenues.map((venue) => (
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

                        {venue.address && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate">{venue.address}</span>
                          </>
                        )}

                        {/* Distance (only if we can compute it) */}
                        {sortByDistance && origin && (
                          <>
                            <span className="hidden sm:inline">•</span>
                            <span className="truncate text-gray-300">
                              {formatDistance(venue.distance_m) ?? "Distance unknown"}
                            </span>
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
              ))}
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