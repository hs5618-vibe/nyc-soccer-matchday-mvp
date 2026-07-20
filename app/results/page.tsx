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
const TEAM_CRESTS: Record<string, string> = {
  // Premier League
  'Arsenal FC': 'https://crests.football-data.org/57.png',
  'Liverpool FC': 'https://crests.football-data.org/64.png',
  'Manchester City FC': 'https://crests.football-data.org/65.png',
  'Manchester United FC': 'https://crests.football-data.org/66.png',
  'Tottenham Hotspur FC': 'https://crests.football-data.org/73.png',
  'Newcastle United FC': 'https://crests.football-data.org/67.png',
  'Everton FC': 'https://crests.football-data.org/62.png',
  'Brentford FC': 'https://crests.football-data.org/402.png',
  'Chelsea FC': 'https://crests.football-data.org/61.png',
  'Aston Villa FC': 'https://crests.football-data.org/58.png',
  'Brighton & Hove Albion FC': 'https://crests.football-data.org/397.png',
  'West Ham United FC': 'https://crests.football-data.org/563.png',
  'Wolverhampton Wanderers FC': 'https://crests.football-data.org/76.png',
  'Fulham FC': 'https://crests.football-data.org/63.png',
  'Crystal Palace FC': 'https://crests.football-data.org/354.png',
  'Nottingham Forest FC': 'https://crests.football-data.org/351.png',
  'AFC Bournemouth': 'https://crests.football-data.org/1044.png',
  'Leicester City FC': 'https://crests.football-data.org/338.png',
  'Ipswich Town FC': 'https://crests.football-data.org/57.png',
  'Southampton FC': 'https://crests.football-data.org/340.png',
  // European clubs
  'FC Barcelona': 'https://crests.football-data.org/81.png',
  'Real Madrid CF': 'https://crests.football-data.org/86.png',
  'Club Atlético de Madrid': 'https://crests.football-data.org/78.png',
  'FC Bayern München': 'https://crests.football-data.org/5.png',
  'Borussia Dortmund': 'https://crests.football-data.org/4.png',
  'Paris Saint-Germain FC': 'https://crests.football-data.org/524.png',
  'Olympique Lyonnais': 'https://crests.football-data.org/523.png',
  'Olympique de Marseille': 'https://crests.football-data.org/516.png',
  'Inter Milan': 'https://crests.football-data.org/108.png',
  'Juventus FC': 'https://crests.football-data.org/109.png',
  'AC Milan': 'https://crests.football-data.org/98.png',
  'AS Roma': 'https://crests.football-data.org/100.png',
  'SSC Napoli': 'https://crests.football-data.org/113.png',
  'SS Lazio': 'https://crests.football-data.org/110.png',
  'FC Porto': 'https://crests.football-data.org/503.png',
  'SL Benfica': 'https://crests.football-data.org/498.png',
  'Sporting CP': 'https://crests.football-data.org/498.png',
  'AFC Ajax': 'https://crests.football-data.org/678.png',
  'PSV Eindhoven': 'https://crests.football-data.org/674.png',
  'Boca Juniors': 'https://crests.football-data.org/null.png',
  'River Plate': 'https://crests.football-data.org/null.png',
  // World Cup nations
  'Argentina': 'https://crests.football-data.org/762.png',
  'Brazil': 'https://crests.football-data.org/764.svg',
  'Colombia': 'https://crests.football-data.org/818.svg',
  'Mexico': 'https://crests.football-data.org/769.svg',
  'Uruguay': 'https://crests.football-data.org/758.svg',
  'Spain': 'https://crests.football-data.org/760.svg',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Portugal': '🇵🇹',
  'Italy': '🇮🇹',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Denmark': '🇩🇰',
  'Morocco': '🇲🇦',
  'Senegal': '🇸🇳',
  'Ghana': '🇬🇭',
  'Cameroon': '🇨🇲',
  'Nigeria': '🇳🇬',
  "Cote d'Ivoire": '🇨🇮',
  'Cape Verde': '🇨🇻',
  'Congo DR': '🇨🇩',
  'Curacao': '🇨🇼',
  'Czechia': '🇨🇿',
  'Haiti': '🇭🇹',
  'Jordan': '🇯🇴',
  'Norway': '🇳🇴',
  'Qatar': '🇶🇦',
  'Sweden': '🇸🇪',
  'Uzbekistan': '🇺🇿',
  'Bosnia and Herzegovina': '🇧🇦',
  'South Africa': '🇿🇦',
  'Egypt': '🇪🇬',
  'Tunisia': '🇹🇳',
  'Algeria': '🇩🇿',
  'Mali': '🇲🇱',
  'Tanzania': '🇹🇿',
  'Comoros': '🇰🇲',
  'Benin': '🇧🇯',
  'Botswana': '🇧🇼',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'Australia': '🇦🇺',
  'Iran': '🇮🇷',
  'Saudi Arabia': '🇸🇦',
  'United States': '🇺🇸',
  'Canada': '🇨🇦',
  'Ecuador': '🇪🇨',
  'Chile': '🇨🇱',
  'Paraguay': '🇵🇾',
  'Venezuela': '🇻🇪',
  'Bolivia': '🇧🇴',
  'Peru': '🇵🇪',
  'Panama': '🇵🇦',
  'Costa Rica': '🇨🇷',
  'Honduras': '🇭🇳',
  'El Salvador': '🇸🇻',
  'Jamaica': '🇯🇲',
  'Trinidad and Tobago': '🇹🇹',
  'Cuba': '🇨🇺',
  'Guatemala': '🇬🇹',
  'New Zealand': '🇳🇿',
  'Serbia': '🇷🇸',
  'Croatia': '🇭🇷',
  'Poland': '🇵🇱',
  'Switzerland': '🇨🇭',
  'Austria': '🇦🇹',
  'Ukraine': '🇺🇦',
  'Turkey': '🇹🇷',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Slovakia': '🇸🇰',
  'Slovenia': '🇸🇮',
  'Albania': '🇦🇱',
  'Iraq': '🇮🇶',
  'Indonesia': '🇮🇩',
};

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

function barTypeTag(barType: string | null | undefined) {
  if (!barType) return null;
  const styles: Record<string, string> = {
    'Irish Pub':  'bg-emerald-700/30 border border-emerald-500/30 text-emerald-300',
    'Soccer Bar': 'bg-blue-700/30 border border-blue-500/30 text-blue-300',
    'Sports Bar': 'bg-orange-700/30 border border-orange-500/30 text-orange-300',
    'Rooftop':    'bg-purple-700/30 border border-purple-500/30 text-purple-300',
    'Brewery':    'bg-amber-700/30 border border-amber-500/30 text-amber-300',
    'Restaurant': 'bg-rose-700/30 border border-rose-500/30 text-rose-300',
    'Bar':        'bg-slate-700/30 border border-slate-500/30 text-slate-300',
    'Fan Zone':   'bg-yellow-700/30 border border-yellow-500/30 text-yellow-300',
  };
  const cls = styles[barType] ?? 'bg-white/10 border border-white/20 text-gray-300';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${cls}`}>
      {barType}
    </span>
  );
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
  const [interestedCount, setInterestedCount] = useState(0);
  const [isInterested, setIsInterested] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [verifiedDates, setVerifiedDates] = useState<Record<string, string>>({});
  const [engagementScores, setEngagementScores] = useState<Record<string, number>>({});
  const [goingMap, setGoingMap] = useState<Record<string, number>>({});
  const [userGoingSet, setUserGoingSet] = useState<Set<string>>(new Set());
  const [soundMap, setSoundMap] = useState<Record<string, boolean>>({});
  const [outdoorTvFilter, setOutdoorTvFilter] = useState(false);
  const [outdoorTvMap, setOutdoorTvMap] = useState<Record<string, boolean>>({});
  const [selectedBorough, setSelectedBorough] = useState<string>('all');

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
        const allVenues = await fetchAllVenues();
        const merged: VenueWithMeta[] = (allVenues || []).map((v) => ({
          ...v,
          is_showing: true,
          going_count: 0,
          verified_by_owner: false,
        }));
        setVenues(merged);
        setLoading(false);
        return;
      }

      setLoading(true);

      const [matchData, showingVenues, allVenues, goingRows, soundRows] = await Promise.all(
        [
          fetchMatchById(matchId),
          fetchVenuesByMatch(matchId),
          fetchAllVenues(),
          supabase.from("going").select("venue_id").eq("match_id", matchId),
          supabase.from("venue_matches").select("venue_id, sound_on").eq("match_id", matchId),
        ]
      );

      setMatch(matchData);

      const showingIds = new Set((showingVenues || []).map((v) => v.id));
      const verifiedIds = new Set((showingVenues || []).map((v) => v.id).filter((id) => {
        const vm = showingVenues.find((v) => v.id === id);
        return (vm as any)?.verified_by_owner === true;
      }));
      const vDates: Record<string, string> = {};
      (showingVenues || []).forEach((v: any) => {
        if (v.verified_by_owner && v.created_at) {
          vDates[v.id] = v.created_at;
        }
      });
      setVerifiedDates(vDates);
      const counts: Record<string, number> = {};
      (goingRows.data || []).forEach((r: any) => {
        const vid = String(r.venue_id);
        counts[vid] = (counts[vid] || 0) + 1;
      });
      setGoingMap(counts);

      const sMap: Record<string, boolean> = {};
      (soundRows.data || []).forEach((r: any) => {
        sMap[String(r.venue_id)] = r.sound_on || false;
      });
      setSoundMap(sMap);

      const { data: tvData } = await supabase.from('venues').select('id, outdoor_tv');
      const tvMap: Record<string, boolean> = {};
      (tvData || []).forEach((v: any) => {
        tvMap[String(v.id)] = v.outdoor_tv || false;
      });
      setOutdoorTvMap(tvMap);

      const merged: VenueWithMeta[] = (allVenues || [])
        .filter((v) => showingIds.has(v.id))
        .map((v) => ({
          ...v,
          is_showing: true,
          going_count: counts[v.id] || 0,
          verified_by_owner: verifiedIds.has(v.id),
        }));

      // Load interested count and user status
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      const { data: interestedRows } = await supabase
        .from('interested')
        .select('user_id')
        .eq('match_id', matchId);

      setInterestedCount((interestedRows || []).length);

      if (user) {
        setIsInterested((interestedRows || []).some((r: any) => r.user_id === user.id));
        const { data: userGoingRows } = await supabase
          .from('going')
          .select('venue_id')
          .eq('match_id', matchId)
          .eq('user_id', user.id);
        const myGoing = new Set(
          (userGoingRows || []).map((r: any) => String(r.venue_id))
        );
        setUserGoingSet(myGoing);
      }
      setVenues(merged);
      const { data: engagementData } = await supabase.rpc('get_venue_engagement');
      const scores: Record<string, number> = {};
      const now = new Date();
      (engagementData || []).forEach((row: any) => {
        let score = 0;
        if (row.last_login) {
          const daysSince = (now.getTime() - new Date(row.last_login).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSince <= 7) score += 3;
          else if (daysSince <= 30) score += 2;
          else score += 1;
        }
        if (row.has_bio) score += 1;
        scores[row.venue_id] = score;
      });
      setEngagementScores(scores);
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
    const arr = [...venuesWithDistance].filter((v: any) => {
      if (outdoorTvFilter && !outdoorTvMap[v.id]) return false;
      if (selectedBorough !== 'all' && v.borough !== selectedBorough) return false;
      return true;
    });

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
    const matchTeams = [match?.home_team, match?.away_team].filter(Boolean);
    const isAffinityBar = (v: any) =>
      v.supported_teams?.some((t: string) =>
        matchTeams.some(mt => mt && (mt.includes(t.replace(' FC', '').replace(' CF', '')) || t.includes(mt.replace(' FC', '').replace(' CF', ''))))
      );

    arr.sort((a, b) => {
      const aAffinity = isAffinityBar(a) ? 1 : 0;
      const bAffinity = isAffinityBar(b) ? 1 : 0;
      if (aAffinity !== bAffinity) return bAffinity - aAffinity;
      if (a.going_count !== b.going_count) return b.going_count - a.going_count;
      if (a.verified_by_owner !== b.verified_by_owner) return a.verified_by_owner ? -1 : 1;
      const aScore = engagementScores[a.id] || 0;
      const bScore = engagementScores[b.id] || 0;
      if (aScore !== bScore) return bScore - aScore;
      const aDate = verifiedDates[a.id] || "9999";
      const bDate = verifiedDates[b.id] || "9999";
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return a.name.localeCompare(b.name);
    });

    return arr;
  }, [venuesWithDistance, nearMe, origin, verifiedDates, engagementScores, match, outdoorTvFilter, outdoorTvMap, selectedBorough]);

  async function toggleGoing(venueId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      alert("Please sign in to mark yourself as going");
      return;
    }
    if (!matchId) return;
    const isGoing = userGoingSet.has(venueId);
    const next = !isGoing;

    setUserGoingSet(prev => {
      const s = new Set(prev);
      next ? s.add(venueId) : s.delete(venueId);
      return s;
    });
    setGoingMap(prev => ({
      ...prev,
      [venueId]: Math.max(0, (prev[venueId] || 0) + (next ? 1 : -1)),
    }));

    if (next) {
      await supabase.from('going').upsert(
        { match_id: matchId, venue_id: venueId, user_id: user.id },
        { onConflict: 'match_id,venue_id,user_id' }
      );
      await supabase.from('interested').upsert(
        { match_id: matchId, user_id: user.id },
        { onConflict: 'match_id,user_id' }
      );
    } else {
      await supabase.from('going').delete()
        .eq('match_id', matchId)
        .eq('venue_id', venueId)
        .eq('user_id', user.id);
    }
  }
  async function toggleInterested() {
    if (!user) {
      alert("Please sign in to mark yourself as interested");
      return;
    }
    const next = !isInterested;
    setIsInterested(next);
    setInterestedCount(prev => Math.max(0, prev + (next ? 1 : -1)));

    if (next) {
      await supabase.from('interested').upsert(
        { match_id: matchId, user_id: user.id },
        { onConflict: 'match_id,user_id' }
      );
    } else {
      await supabase.from('interested').delete()
        .eq('match_id', matchId).eq('user_id', user.id);
    }
  }
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

  if (!match && matchId) {
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

        {!matchId && (
          <div className="mb-6">
            <h1 className="text-3xl font-black text-white mb-1">All Venues</h1>
            <p className="text-gray-400 text-sm">Every bar on awaydayz — click a match on the homepage to filter by game.</p>
          </div>
        )}

        {/* World Cup link if WC match */}
        {match?.league === 'World Cup' && (
          <Link
            href="/worldcup-nyc"
            className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-2 mb-6 hover:bg-yellow-500/20 transition-all inline-flex"
          >
            <img src="https://crests.football-data.org/wm26.png" className="w-5 h-5 object-contain" alt="WC26" />
            <span className="text-yellow-300 text-sm font-semibold">Full World Cup NYC guide →</span>
          </Link>
        )}

        {/* Match Card */}
        {match && <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 sm:p-8 mb-8">
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

          <div className="border-t border-white/10 pt-4 sm:pt-6">
            <div className="flex items-center justify-center gap-2 text-gray-300 mb-4">
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-base sm:text-lg font-semibold">{formatMatchTime(match.kickoff_time)}</span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={toggleInterested}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  isInterested
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                ⚡ Interested{interestedCount >= 5 ? ` · ${interestedCount}` : ''}
              </button>
            </div>
          </div>
        </div>}

        {/* Bars Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-white uppercase tracking-wide">Sports Bars</h2>
            <span className="text-sm text-gray-400">
              {stats.showing} {stats.showing === 1 ? 'bar' : 'bars'} showing this game
            </span>
          </div>

          {/* Borough Filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide mb-4">
            {['all', 'Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'].map(borough => (
              <button
                key={borough}
                onClick={() => setSelectedBorough(borough)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  selectedBorough === borough
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-transparent text-gray-400 border border-white/10 hover:border-white/20'
                }`}
              >
                {borough === 'all' ? 'All Boroughs' : borough}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
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
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input type="checkbox" checked={outdoorTvFilter}
                  onChange={(e) => setOutdoorTvFilter(e.target.checked)} className="h-4 w-4" />
                <span className="font-semibold text-sm">📺 Outdoor TV</span>
              </label>
              </div>

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
                  className="block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-1 mb-2 min-w-0">
                        <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors break-words w-full">
                          {venue.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-1.5">
                        {venue.verified_by_owner && (
                          <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1">
                            ✓ Verified
                          </span>
                        )}
                        {soundMap[venue.id] && (
                          <span className="bg-white/10 border border-white/20 text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                            🔊
                          </span>
                        )}
                        {outdoorTvMap[venue.id] && (
                          <span className="bg-white/10 border border-white/20 text-gray-300 text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                            📺
                          </span>
                        )}
                        {(venue as any).supported_teams
                          ?.filter((t: string) => {
                            const matchTeams = [match?.home_team, match?.away_team].filter(Boolean);
                            return matchTeams.some(mt => mt && (
                              mt.includes(t.replace(' FC','').replace(' CF','')) ||
                              t.includes(mt.replace(' FC','').replace(' CF',''))
                            ));
                          })
                          .slice(0, 3)
                          .map((team: string) => {
                            const crest = TEAM_CRESTS[team];
                            if (!crest) return null;
                            if (crest.startsWith('http')) {
                              return (
                                <img
                                  key={team}
                                  src={crest}
                                  alt={team}
                                  title={team}
                                  className="w-5 h-5 object-contain flex-shrink-0"
                                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                              );
                            }
                            return (
                              <span key={team} title={team} className="text-lg flex-shrink-0">{crest}</span>
                            );
                          })}
                      </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400">                        <span className="flex items-center gap-1">
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
                      {nearMe && origin && (
                        <div className="text-xs text-gray-300 text-right">
                          {venue.distance_miles != null
                            ? formatMiles(venue.distance_miles)
                            : "—"}
                        </div>
                      )}

                      {matchId && (
                        <button
                          onClick={(e) => toggleGoing(venue.id, e)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                            userGoingSet.has(venue.id)
                              ? 'bg-green-600 text-white'
                              : 'bg-white/10 text-gray-300 hover:bg-white/20'
                          }`}
                        >
                          🎟️ {userGoingSet.has(venue.id) ? 'Going' : 'Going?'}
                          {(goingMap[venue.id] || 0) >= 5 && (
                            <span className="opacity-80">· {goingMap[venue.id]}</span>
                          )}
                        </button>
                      )}

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