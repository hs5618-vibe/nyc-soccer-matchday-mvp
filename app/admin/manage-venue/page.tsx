"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { isAdmin } from "@/lib/admin";
import { fetchUpcomingMatches } from "@/lib/matches";
import Link from "next/link";
import { Suspense } from "react";

type Match = {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  league: string;
};

type VenueMatch = {
  venue_id: string;
  match_id: string;
  sound_on?: boolean;
};

function ManageVenueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const venueId = searchParams.get("venue");

  const [venueName, setVenueName] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [venueMatches, setVenueMatches] = useState<VenueMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("all");
  const [venueDefaults, setVenueDefaults] = useState<{venue_id: string, league: string | null, team: string | null}[]>([]);
  const [bio, setBio] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [editingBio, setEditingBio] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [supportedTeams, setSupportedTeams] = useState<string[]>([]);
  const [outdoorTv, setOutdoorTv] = useState(false);
  const [isCrawler, setIsCrawler] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!venueId) {
        router.push("/admin");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const adminCheck = await isAdmin(user.id);
      if (!adminCheck) { router.push("/"); return; }

      // Load venue name
      const { data: venueData } = await supabase
        .from("venues")
        .select("name, bio, image_url, supported_teams, outdoor_tv, is_crawler")
        .eq("id", venueId)
        .single();
      setVenueName(venueData?.name || venueId);
      setBio(venueData?.bio || "");
      setImageUrl((venueData as any)?.image_url || "");
      setSupportedTeams((venueData as any)?.supported_teams || []);
      setOutdoorTv((venueData as any)?.outdoor_tv || false);
      setIsCrawler((venueData as any)?.is_crawler || false);

      // Load matches
      const upcomingMatches = await fetchUpcomingMatches();
      setMatches(upcomingMatches as Match[]);

      // Load existing venue matches
      const { data: vmData } = await supabase
        .from("venue_matches")
        .select("venue_id, match_id, sound_on")
        .eq("venue_id", venueId);
      setVenueMatches(vmData || []);
      const { data: defaultsData } = await supabase
        .from("venue_defaults")
        .select("venue_id, league, team")
        .eq("venue_id", venueId);
      setVenueDefaults(defaultsData || []);
      setLoading(false);
    }

    loadData();
  }, [venueId, router]);

  const leagues = useMemo(() => {
    const unique = Array.from(new Set(matches.map(m => m.league)));
    return ['all', ...unique.sort()];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (selectedLeague !== 'all') filtered = filtered.filter(m => m.league === selectedLeague);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.home_team.toLowerCase().includes(q) || m.away_team.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [matches, selectedLeague, searchQuery]);

  const venueMatchIds = venueMatches.map(vm => vm.match_id);

  async function toggleMatch(matchId: string, isShowing: boolean) {
    if (!venueId) return;
    setSaving(matchId);
    try {
      if (isShowing) {
        await supabase.from("venue_matches").delete()
          .eq("venue_id", venueId).eq("match_id", matchId);
        setVenueMatches(prev => prev.filter(vm => vm.match_id !== matchId));
      } else {
        await supabase.from("venue_matches")
          .insert({ venue_id: venueId, match_id: matchId, verified_by_owner: false });
        setVenueMatches(prev => [...prev, { venue_id: venueId, match_id: matchId }]);
      }
    } catch (error) {
      alert("Failed to update. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function toggleDefault() {
    if (!venueId) return;
    if (selectedLeague === 'all' && !searchQuery.trim()) return;

    const league = selectedLeague !== 'all' ? selectedLeague : null;
    const team = searchQuery.trim() || null;

    const existing = venueDefaults.find(d =>
      d.venue_id === venueId && d.league === league && d.team === team
    );

    if (existing) {
      await supabase.from("venue_defaults").delete()
        .eq("venue_id", venueId)
        .eq("league", league || '')
        .eq("team", team || '');
      setVenueDefaults(prev => prev.filter(d =>
        !(d.venue_id === venueId && d.league === league && d.team === team)
      ));
    } else {
      const { data } = await supabase.from("venue_defaults")
        .upsert({ venue_id: venueId, league, team }, { onConflict: 'venue_id,league,team' })
        .select().single();
      if (data) setVenueDefaults(prev => [...prev, data]);
    }
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
      await supabase.from('venues').update({ image_url: publicUrl }).eq('id', venueId);
      setImageUrl(publicUrl);
    } catch {
      alert('Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleRemoveImage() {
    if (!venueId) return;
    await supabase.from('venues').update({ image_url: null }).eq('id', venueId);
    setImageUrl('');
  }
  async function toggleMatchSound(matchId: string, currentSound: boolean) {
    if (!venueId) return;
    const next = !currentSound;
    setVenueMatches(prev => prev.map(vm =>
      vm.match_id === matchId ? { ...vm, sound_on: next } : vm
    ));
    await supabase.from('venue_matches')
      .update({ sound_on: next })
      .eq('venue_id', venueId)
      .eq('match_id', matchId);
  }
  async function toggleOutdoorTv() {
    if (!venueId) return;
    const next = !outdoorTv;
    setOutdoorTv(next);
    await supabase.from('venues').update({ outdoor_tv: next }).eq('id', venueId);
  }

  async function toggleCrawler() {
    if (!venueId) return;
    const next = !isCrawler;
    setIsCrawler(next);
    await supabase.from('venues').update({ is_crawler: next }).eq('id', venueId);
  }
  async function saveTeams(teams: string[]) {
    if (!venueId) return;
    setSupportedTeams(teams);
    await supabase.from('venues').update({ supported_teams: teams }).eq('id', venueId);
  }
  async function handleSaveBio() {
    if (!venueId) return;
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
  async function tickAll() {
    if (!venueId) return;
    const toAdd = filteredMatches.filter(m => !venueMatchIds.includes(m.id));
    if (toAdd.length === 0) return;
    const rows = toAdd.map(m => ({ venue_id: venueId, match_id: m.id, verified_by_owner: false }));
    await supabase.from("venue_matches").upsert(rows, { onConflict: 'venue_id,match_id' });
    setVenueMatches(prev => [...prev, ...toAdd.map(m => ({ venue_id: venueId, match_id: m.id }))]);
  }

  async function untickAll() {
    if (!venueId) return;
    const toRemove = filteredMatches.filter(m => venueMatchIds.includes(m.id)).map(m => m.id);
    if (toRemove.length === 0) return;
    await supabase.from("venue_matches").delete().eq("venue_id", venueId).in("match_id", toRemove);
    setVenueMatches(prev => prev.filter(vm => !toRemove.includes(vm.match_id)));
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

  const allFilteredTicked = filteredMatches.every(m => venueMatchIds.includes(m.id));

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to admin
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-green-600 text-white text-xs font-bold px-2 py-1 rounded">ADMIN</span>
            <h1 className="text-4xl font-black text-white">{venueName}</h1>
          </div>
          <p className="text-gray-400">Managing matches on behalf of this bar</p>
        </div>

        {/* Cover Photo */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Cover Photo</h3>
          {imageUrl ? (
            <div className="relative">
              <img src={imageUrl} alt={venueName} className="w-full h-40 object-cover rounded-xl" />
              <div className="absolute bottom-2 right-2 flex gap-2">
                <label className="bg-black/60 hover:bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-all">
                  {uploadingImage ? 'Uploading...' : '📷 Change'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
                </label>
                <button onClick={handleRemoveImage} className="bg-red-600/70 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all">✕ Remove</button>
              </div>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-28 bg-white/5 border border-white/10 border-dashed rounded-xl cursor-pointer hover:bg-white/10 transition-all">
              <span className="text-2xl mb-1">📷</span>
              <span className="text-sm text-gray-400 font-semibold">{uploadingImage ? 'Uploading...' : 'Add a cover photo'}</span>
              <span className="text-xs text-gray-600 mt-1">JPG or PNG recommended</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
            </label>
          )}
        </div>
        {/* Venue Features */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Venue Features</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={outdoorTv} onChange={toggleOutdoorTv} className="w-4 h-4 cursor-pointer" />
              <span className="text-sm text-white font-semibold">📺 Outdoor TV or screen</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isCrawler} onChange={toggleCrawler} className="w-4 h-4 cursor-pointer" />
              <span className="text-sm text-white font-semibold flex items-center gap-2">
                <img src="https://dvtqvuolzemazkyawrup.supabase.co/storage/v1/object/public/venue-images/Crawler.png" className="w-4 h-4 rounded-full" alt="Crawler" />
                Crawler partner bar
              </span>
            </label>
          </div>
        </div>
        {/* Supported Teams */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-2">Club & Country Rep</h3>
          <p className="text-xs text-gray-500 mb-3">Select any club or national team this bar is a home for.</p>
          <p className="text-xs text-gray-500 font-semibold mb-2">🏟️ Clubs</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              'Arsenal FC','Chelsea FC','Liverpool FC','Manchester City FC','Manchester United FC',
              'Tottenham Hotspur FC','Newcastle United FC','Everton FC','Brentford FC',
              'Aston Villa FC','Brighton & Hove Albion FC','West Ham United FC',
              'Wolverhampton Wanderers FC','Fulham FC','Crystal Palace FC','Nottingham Forest FC',
              'AFC Bournemouth','Leicester City FC','Southampton FC',
              'FC Barcelona','Real Madrid CF','Club Atlético de Madrid','FC Bayern München',
              'Borussia Dortmund','Paris Saint-Germain FC','Olympique Lyonnais','Olympique de Marseille',
              'Inter Milan','Juventus FC','AC Milan','AS Roma','SSC Napoli','SS Lazio',
              'FC Porto','SL Benfica','Sporting CP','AFC Ajax','PSV Eindhoven',
              'Boca Juniors','River Plate',
            ].map((team) => {
              const selected = supportedTeams.includes(team);
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => {
                    if (!selected && supportedTeams.length >= 5) return;
                    const next = selected ? supportedTeams.filter(t => t !== team) : [...supportedTeams, team];
                    saveTeams(next);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    selected
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  {team}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 font-semibold mb-2">🌍 National Teams</p>
          <div className="flex flex-wrap gap-2">
            {[
              'Argentina','Brazil','Colombia','Mexico','Uruguay','Spain','England','France',
              'Germany','Portugal','Italy','Netherlands','Belgium','Denmark','Morocco',
              'Senegal','Ghana','Cameroon','Nigeria','South Africa','Egypt','Tunisia',
              'Algeria','Japan','South Korea','Australia','Iran','Saudi Arabia',
              'United States','Canada','Ecuador','Chile','Paraguay','Venezuela',
              'Bolivia','Peru','Panama','Costa Rica','Honduras','El Salvador',
              'Jamaica','Trinidad and Tobago','Cuba','Guatemala','New Zealand',
              'Serbia','Croatia','Poland','Switzerland','Austria','Ukraine','Turkey',
              'Scotland','Wales','Slovakia','Slovenia','Albania','Iraq','Indonesia',
            ].map((team) => {
              const selected = supportedTeams.includes(team);
              return (
                <button
                  key={team}
                  type="button"
                  onClick={() => {
                    if (!selected && supportedTeams.length >= 5) return;
                    const next = selected ? supportedTeams.filter(t => t !== team) : [...supportedTeams, team];
                    saveTeams(next);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    selected
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  {team}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-2">{supportedTeams.length}/5 selected</p>
        </div>
        {/* Bio */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">Bar Description</h3>
            {!editingBio && (
              <button
                onClick={() => { setEditingBio(true); setBioInput(bio); }}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {bio ? "Edit" : "Add description"}
              </button>
            )}
          </div>
          {!editingBio ? (
            <p className="text-sm text-gray-300">{bio || <span className="text-gray-500 italic">No description yet</span>}</p>
          ) : (
            <div>
              <textarea
                value={bioInput}
                onChange={(e) => setBioInput(e.target.value.slice(0, 500))}
                placeholder="Tell fans about this bar..."
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

        {/* Search + League Filter */}
        <div className="mb-6 space-y-3">
          <input
            type="text"
            placeholder="Search for a team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {leagues.map(league => (
              <button
                key={league}
                onClick={() => setSelectedLeague(league)}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedLeague === league
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-transparent text-gray-400 border border-white/10 hover:border-white/20'
                }`}
              >
                {league === 'all' ? 'All' : league}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
          {filteredMatches.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No matches found</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                  {filteredMatches.length} matches
                </h3>
                <div className="flex gap-3 flex-wrap">
                  {selectedLeague !== 'all' || searchQuery.trim() ? (() => {
                    const league = selectedLeague !== 'all' ? selectedLeague : null;
                    const team = searchQuery.trim() || null;
                    const isDefault = venueDefaults.some(d =>
                      d.venue_id === venueId && d.league === league && d.team === team
                    );
                    return (
                      <button
                        onClick={toggleDefault}
                        className={`text-sm font-semibold transition-colors ${
                          isDefault ? 'text-green-400 hover:text-red-400' : 'text-gray-400 hover:text-green-400'
                        }`}
                      >
                        {isDefault ? '★ Default (click to remove)' : '☆ Set as default'}
                      </button>
                    );
                  })() : null}
                  {!allFilteredTicked && (
                    <button onClick={tickAll} className="text-sm font-semibold text-blue-400 hover:text-blue-300">
                      ✓ Tick all
                    </button>
                  )}
                  {venueMatchIds.some(id => filteredMatches.map(m => m.id).includes(id)) && (
                    <button onClick={untickAll} className="text-sm font-semibold text-red-400 hover:text-red-300">
                      ✗ Untick all
                    </button>
                  )}
                </div>
              </div>
              {filteredMatches.map((match) => {
                const isShowing = venueMatchIds.includes(match.id);
                const isSaving = saving === match.id;
                return (
                  <div key={match.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white mb-1 truncate">
                          {match.home_team} vs {match.away_team}
                        </p>
                        <p className="text-sm text-gray-400">
                          {match.league} • {new Date(match.kickoff_time).toLocaleString("en-US", {
                            weekday: "short", month: "short", day: "numeric",
                            hour: "numeric", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        {isShowing && (
                          <label className="flex items-center gap-2 cursor-pointer">
                            <span className="text-xs text-gray-400 hidden sm:inline">🔊 Sound on</span>
                            <input
                              type="checkbox"
                              checked={venueMatches.find(vm => vm.match_id === match.id)?.sound_on || false}
                              onChange={() => toggleMatchSound(match.id, venueMatches.find(vm => vm.match_id === match.id)?.sound_on || false)}
                              className="w-4 h-4 cursor-pointer"
                            />
                          </label>
                        )}
                        <label className="flex items-center gap-3 cursor-pointer">
                          <span className="text-sm font-semibold text-gray-300 hidden sm:inline">
                            {isSaving ? "Saving..." : "Showing"}
                          </span>
                          <input
                            type="checkbox"
                            checked={isShowing}
                            disabled={isSaving}
                            onChange={() => toggleMatch(match.id, isShowing)}
                            className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminManageVenuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
      </div>
    }>
      <ManageVenueContent />
    </Suspense>
  );
}