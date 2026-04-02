"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchMatchById, formatMatchTime, type Match } from "@/lib/matches";
import {
  fetchVenuesByMatch,
  fetchAllVenues,
  type Venue as BaseVenue,
} from "@/lib/venues";

type VenueWithMeta = BaseVenue & {
  is_showing: boolean;
  going_count: number;
  verified_by_owner: boolean;
};

type LatLng = { lat: number; lng: number };

function haversineMiles(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R_km = 6371;

  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;

  const c = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  const km = R_km * c;
  const miles = km * 0.621371;

  return miles;
}

function formatMiles(m: number) {
  if (!Number.isFinite(m)) return "";
  if (m < 0.1) return "<0.1 mi";
  if (m < 10) return `${m.toFixed(1)} mi`;
  return `${Math.round(m)} mi`;
}

async function geocodeAddress(address: string): Promise<LatLng | null> {
  // Uses OpenStreetMap Nominatim (no key) — good for MVP.
  // IMPORTANT: add a simple user-agent header via fetch init (browser sets some headers).
  // If you later want higher reliability, we’ll swap to Google Places / Mapbox.
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    address
  )}&limit=1`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) return null;
    const json = (await res.json()) as any[];

    if (!json?.length) return null;

    const first = json[0];
    const lat = Number(first.lat);
    const lng = Number(first.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

function ResultsContent() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");

  const [match, setMatch] = useState<Match | null>(null);
  const [venues, setVenues] = useState<VenueWithMeta[]>([]);
  const [loading, setLoading] = useState(true);

  // Near-me controls
  const [nearMe, setNearMe] = useState(false);
  const [origin, setOrigin] = useState<LatLng | null>(null);
  const [originLabel, setOriginLabel] = useState<string>("");
  const [geoError, setGeoError] = useState<string>("");

  // Manual address
  const [addressInput, setAddressInput] = useState("");

  useEffect(() => {
    async function load() {
      if (!matchId) {
        setMatch(null);
        setVenues([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      const [matchData, showingVenues, allVenues, goingRows] = await Promise.all(
        [
          fetchMatchById(matchId),
          fetchVenuesByMatch(matchId),
          fetchAllVenues(),
          supabase.from("going").select("venue_id").eq("match_id", matchId),
        ]
      );

      setMatch(matchData);

      const showingIds = new Set((showingVenues || []).map((v) => v.id));
      const verifiedIds = new Set((showingVenues || []).map((v) => v.id).filter((id) => {
        const vm = showingVenues.find((v) => v.id === id);
        return (vm as any)?.verified_by_owner === true;
      }));

      const counts: Record<string, number> = {};
      (goingRows.data || []).forEach((r: any) => {
        const vid = String(r.venue_id);
        counts[vid] = (counts[vid] || 0) + 1;
      });

      const merged: VenueWithMeta[] = (allVenues || []).map((v) => ({
        ...v,
        is_showing: showingIds.has(v.id),
        going_count: counts[v.id] || 0,
        verified_by_owner: verifiedIds.has(v.id),
      }));

      setVenues(merged);
      setLoading(false);
    }

    load();
  }, [matchId]);

  // If Near Me toggled on, try to get geolocation (unless we already have an origin set by address)
  useEffect(() => {
    if (!nearMe) return;

    // If user already set an origin via address, don’t override it.
    if (origin) return;

    if (!navigator.geolocation) {
      setGeoError("Geolocation not supported on this device/browser.");
      return;
    }

    setGeoError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setOrigin({ lat, lng });
        setOriginLabel("Current location");
      },
      (err) => {
        setGeoError(
          err?.message || "Could not get your location. Try entering an address."
        );
      },
      { enableHighAccuracy: false, timeout: 8000 }
    );
  }, [nearMe, origin]);

  const stats = useMemo(() => {
    const showing = venues.filter((v) => v.is_showing).length;
    const notConfirmed = venues.length - showing;
    return { showing, notConfirmed };
  }, [venues]);

  const venuesWithDistance = useMemo(() => {
    if (!nearMe || !origin) {
      return venues.map((v) => ({
        ...v,
        distance_miles: null as number | null,
      }));
    }

    return venues.map((v) => {
      const lat = (v as any).latitude;
      const lng = (v as any).longitude;

      const latNum = Number(lat);
      const lngNum = Number(lng);

      if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
        return { ...v, distance_miles: null as number | null };
      }

      const d = haversineMiles(origin, { lat: latNum, lng: lngNum });
      return { ...v, distance_miles: d };
    });
  }, [venues, nearMe, origin]);

  const sortedVenues = useMemo(() => {
    const arr = [...venuesWithDistance];

    if (nearMe && origin) {
      // Primary sort by distance ascending.
      // Venues without coords go to the bottom.
      arr.sort((a: any, b: any) => {
        const ad = a.distance_miles;
        const bd = b.distance_miles;

        const aHas = typeof ad === "number" && Number.isFinite(ad);
        const bHas = typeof bd === "number" && Number.isFinite(bd);

        if (aHas && bHas) {
          if (ad !== bd) return ad - bd;
        } else if (aHas && !bHas) return -1;
        else if (!aHas && bHas) return 1;

        // Tie-breakers
        if (a.is_showing !== b.is_showing) return a.is_showing ? -1 : 1;
        if (a.going_count !== b.going_count) return b.going_count - a.going_count;
        return a.name.localeCompare(b.name);
      });

      return arr;
    }

    // Default sort (your existing logic)
    arr.sort((a, b) => {
      if (a.is_showing !== b.is_showing) return a.is_showing ? -1 : 1;
      if (a.going_count !== b.going_count) return b.going_count - a.going_count;
      return a.name.localeCompare(b.name);
    });

    return arr;
  }, [venuesWithDistance, nearMe, origin]);

  async function handleUseAddress() {
    const q = addressInput.trim();
    if (!q) return;

    setGeoError("");
    const point = await geocodeAddress(q);

    if (!point) {
      setGeoError("Could not find that address. Try being more specific.");
      return;
    }

    setOrigin(point);
    setOriginLabel(q);
    setNearMe(true);
  }

  function clearOrigin() {
    setOrigin(null);
    setOriginLabel("");
    setGeoError("");
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
            <span className="text-sm text-gray-400">
              {stats.showing} showing • {stats.notConfirmed} not confirmed
            </span>
          </div>

          {/* Near me controls */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <label className="flex items-center gap-3 text-white">
                <input
                  type="checkbox"
                  checked={nearMe}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setNearMe(next);
                    if (!next) {
                      // Keep origin in case you toggle back on quickly,
                      // but you can also clear it if you prefer.
                      // clearOrigin();
                    }
                  }}
                  className="h-4 w-4"
                />
                <span className="font-semibold">Near me</span>
                <span className="text-xs text-gray-400">
                  (sorts by closest)
                </span>
              </label>

              {nearMe && (
                <div className="text-xs text-gray-400">
                  {origin ? (
                    <span>
                      Using: <span className="text-gray-200">{originLabel || "location"}</span>
                    </span>
                  ) : (
                    <span>Getting location…</span>
                  )}
                </div>
              )}
            </div>

            {nearMe && (
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Enter an address (e.g., 33 W 33rd St, NYC)"
                  className="flex-1 rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 outline-none"
                />
                <button
                  onClick={handleUseAddress}
                  className="rounded-xl bg-white/15 hover:bg-white/20 border border-white/10 px-4 py-2 text-sm font-semibold text-white"
                >
                  Use address
                </button>
                <button
                  onClick={() => {
                    // Clear manual origin, then attempt geolocation again if toggle is on
                    clearOrigin();
                  }}
                  className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2 text-sm font-semibold text-gray-200"
                >
                  Reset
                </button>
              </div>
            )}

            {nearMe && geoError && (
              <div className="mt-2 text-xs text-red-300">
                {geoError}
              </div>
            )}

            {nearMe && (
              <div className="mt-2 text-xs text-gray-500">
                Note: bars need <code className="text-gray-300">latitude/longitude</code> to be sortable.
                Bars without coords will drop to the bottom.
              </div>
            )}
          </div>

          {sortedVenues.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 text-center border border-white/10">
              <p className="text-gray-400 text-lg mb-4">No bars available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedVenues.map((venue: any) => (
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
                        {venue.verified_by_owner && (
                          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                            ✓ Verified
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
                      </div>
                    </div>

                    {/* Right-side meta */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        {/* Distance (only if nearMe is on) */}
                        {nearMe && origin && (
                          <div className="text-xs text-gray-300">
                            {venue.distance_miles != null
                              ? formatMiles(venue.distance_miles)
                              : "—"}
                          </div>
                        )}

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