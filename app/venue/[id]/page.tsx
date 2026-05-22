"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";

import { supabase } from "@/lib/supabaseClient";
import { fetchVenueById, type Venue } from "@/lib/venues";
import { fetchMatchById, formatMatchTime, type Match } from "@/lib/matches";
import { isVenueAdmin, getVenueClaimStatus } from "@/lib/venueAdmin";
import { isAdmin } from "@/lib/admin";
import ClaimVenueModal from "@/components/ClaimVenueModal";

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
  'Côte d\'Ivoire': '🇨🇮',
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
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);

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
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [upcomingMatches, setUpcomingMatches] = useState<Match[]>([]);
  const [matchSoundOn, setMatchSoundOn] = useState(false);

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
        if (venueData) setImageUrl((venueData as any).image_url || "");

        if (venueData && matchId) {
          await loadUpdates();
          await loadGoingStatus();
        }

        // Load upcoming fixtures for this venue
        const { data: vmRows } = await supabase
          .from('venue_matches')
          .select('match_id')
          .eq('venue_id', venueId);

        if (vmRows && vmRows.length > 0) {
          const matchIds = vmRows.map((r: any) => r.match_id);
          const { data: upcomingData } = await supabase
            .from('matches')
            .select('*')
            .in('id', matchIds)
            .eq('status', 'upcoming')
            .gte('kickoff_time', new Date().toISOString())
            .order('kickoff_time', { ascending: true })
            .limit(5);
          setUpcomingMatches((upcomingData || []) as Match[]);
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
        const adminCheck = await isAdmin(user.id);
        setIsSystemAdmin(adminCheck);

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

    if (matchId && venueId) {
      const { data: vmData } = await supabase
        .from('venue_matches')
        .select('sound_on')
        .eq('venue_id', venueId)
        .eq('match_id', matchId)
        .maybeSingle();
      setMatchSoundOn(vmData?.sound_on || false);
    }
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !venueId) return;

    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `${venueId}/cover-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('venue-images')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('venue-images')
        .getPublicUrl(path);

      const { error: updateError } = await supabase
        .from('venues')
        .update({ image_url: publicUrl })
        .eq('id', venueId);

      if (updateError) throw updateError;

      setImageUrl(publicUrl);
    } catch (err) {
      alert('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
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

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden mb-6">
          {/* Cover Image */}
          {imageUrl ? (
            <div className="relative">
              <img
                src={imageUrl}
                alt={venue.name}
                className="w-full h-48 sm:h-64 object-cover"
              />
              {(isOwner || isSystemAdmin) && (
                <div className="absolute bottom-3 right-3 flex gap-2">
                  <label className="bg-black/60 hover:bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-all">
                    {uploadingImage ? 'Uploading...' : '📷 Change photo'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                  </label>
                  <button
                    onClick={async () => {
                      await supabase.from('venues').update({ image_url: null }).eq('id', venueId);
                      setImageUrl('');
                    }}
                    className="bg-red-600/70 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all"
                  >
                    ✕ Remove
                  </button>
                </div>
              )}
            </div>
          ) : (isOwner || isSystemAdmin) ? (
            <label className="flex flex-col items-center justify-center h-32 bg-white/5 border-b border-white/10 cursor-pointer hover:bg-white/10 transition-all">
              <span className="text-2xl mb-1">📷</span>
              <span className="text-sm text-gray-400 font-semibold">{uploadingImage ? 'Uploading...' : 'Add a cover photo'}</span>
              <span className="text-xs text-gray-600 mt-1">JPG or PNG recommended</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
            </label>
          ) : null}
          <div className="p-8">
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
                <img src="https://crests.football-data.org/wm26.png" className="w-5 h-5 object-contain" alt="World Cup 2026" />
                Official Fan Zone
              </div>
            )}
            {/* Claim button - show if not owner and no pending claim */}
            {user && !isOwner && !claimStatus && !isClaimed && !venueId?.startsWith('wc-fan-zone') && (
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
              {(venue as any).supported_teams.map((team: string) => {
                const crest = TEAM_CRESTS[team];
                if (crest?.startsWith('http')) {
                  return (
                    <div key={team} className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1 rounded-full">
                      <img
                        src={crest}
                        alt={team}
                        className="w-5 h-5 object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <span className="text-white text-xs font-bold">{team}</span>
                    </div>
                  );
                }
                return (
                  <div key={team} className="flex items-center gap-1.5 bg-white/10 border border-white/20 px-3 py-1 rounded-full">
                    <span className="text-lg">{crest || '🏳️'}</span>
                    <span className="text-white text-xs font-bold">{team}</span>
                  </div>
                );
              })}
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
              {matchSoundOn && (
                <span className="inline-flex items-center gap-1.5 bg-green-600/20 border border-green-500/30 text-green-300 px-3 py-1.5 rounded-full text-xs font-bold">
                  🔊 Sound on for this game
                </span>
              )}
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

              {goingCount >= 5 && (
                <span className="text-gray-400 text-sm">
                  {goingCount} {goingCount === 1 ? "person" : "people"} going
                </span>
              )}
            </div>
          )}
        </div>
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

        {/* Upcoming Fixtures */}
        {upcomingMatches.length > 0 && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wide">Upcoming Fixtures</h2>
            <div className="space-y-3">
              {upcomingMatches.map((m) => (
                <Link
                  key={m.id}
                  href={`/venue/${venueId}?match=${m.id}`}
                  className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-2xl p-3 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {m.home_team_crest && <img src={m.home_team_crest} className="w-6 h-6 object-contain flex-shrink-0" />}
                    <span className="text-sm font-semibold text-white truncate">{m.home_team}</span>
                    <span className="text-gray-500 text-xs flex-shrink-0">vs</span>
                    <span className="text-sm font-semibold text-white truncate">{m.away_team}</span>
                    {m.away_team_crest && <img src={m.away_team_crest} className="w-6 h-6 object-contain flex-shrink-0" />}
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatMatchTime(m.kickoff_time)}</span>
                </Link>
              ))}
            </div>
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

          {!match && (
  <div className="text-center py-8">
    <p className="text-gray-300 font-semibold mb-1">Matchday Updates</p>
    <p className="text-gray-500 text-sm">Select an upcoming fixture above to see live updates for that match.</p>
  </div>
)}

{!user && match && (
  <div className="text-center py-8">
    <p className="text-gray-300 font-semibold mb-1">Matchday Updates</p>
    <p className="text-gray-500 text-sm">Check back on matchday — this bar posts live updates closer to kick-off.</p>
    <Link href="/login" className="inline-block mt-3 text-sm text-blue-400 hover:text-blue-300">
      Sign in to follow along →
    </Link>
  </div>
)}

{user && match && updates.length === 0 && (
  <div className="text-center py-8">
    <p className="text-gray-300 font-semibold mb-1">Matchday Updates</p>
    <p className="text-gray-500 text-sm">This bar posts live updates on game days — check back closer to kick-off.</p>
  </div>
)}

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
