"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getUserVenues } from "@/lib/venueAdmin";
import { fetchUpcomingMatches } from "@/lib/matches";
import Link from "next/link";

type UserVenue = {
  venue_id: string;
  venues: {
    id: string;
    name: string;
    neighborhood: string;
  };
};

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
};

export default function ManagePage() {
  const router = useRouter();
  const [userVenues, setUserVenues] = useState<UserVenue[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [venueMatches, setVenueMatches] = useState<VenueMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [venueDefaults, setVenueDefaults] = useState<{venue_id: string, league: string | null, team: string | null}[]>([]);
  const [venueImages, setVenueImages] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [venueBios, setVenueBios] = useState<Record<string, string>>({});
  const [editingBio, setEditingBio] = useState<string | null>(null);
  const [bioInput, setBioInput] = useState("");
  const [savingBio, setSavingBio] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState("all");

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      const venues = await getUserVenues(user.id);
      if (venues.length === 0) {
        router.push("/");
        return;
      }

      setUserVenues(venues);

      const upcomingMatches = await fetchUpcomingMatches();
      setMatches(upcomingMatches as Match[]);

      const venueIds = venues.map(v => v.venues.id);
      const { data: vmData } = await supabase
        .from("venue_matches")
        .select("venue_id, match_id")
        .in("venue_id", venueIds);

      setVenueMatches(vmData || []);
      const { data: defaultsData } = await supabase
        .from("venue_defaults")
        .select("venue_id, league, team")
        .in("venue_id", venueIds);
      setVenueDefaults(defaultsData || []);
      const { data: imageData } = await supabase
        .from('venues')
        .select('id, image_url, bio')
        .in('id', venueIds);
      const imageMap: Record<string, string> = {};
      const bioMap: Record<string, string> = {};
      (imageData || []).forEach((v: any) => {
        if (v.image_url) imageMap[v.id] = v.image_url;
        if (v.bio) bioMap[v.id] = v.bio;
      });
      setVenueImages(imageMap);
      setVenueBios(bioMap);
    }

    loadData();
  }, [router]);

  const leagues = useMemo(() => {
    const unique = Array.from(new Set(matches.map(m => m.league)));
    return ['all', ...unique.sort()];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let filtered = matches;
    if (selectedLeague !== 'all') {
      filtered = filtered.filter(m => m.league === selectedLeague);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.home_team.toLowerCase().includes(q) ||
        m.away_team.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [matches, selectedLeague, searchQuery]);

  async function toggleMatch(venueId: string, matchId: string, isShowing: boolean) {
    setSaving(`${venueId}-${matchId}`);
    try {
      if (isShowing) {
        const { error } = await supabase
          .from("venue_matches")
          .delete()
          .eq("venue_id", venueId)
          .eq("match_id", matchId);
        if (error) throw error;
        setVenueMatches(prev => prev.filter(
          vm => !(vm.venue_id === venueId && vm.match_id === matchId)
        ));
      } else {
        const { error } = await supabase
          .from("venue_matches")
          .insert({ venue_id: venueId, match_id: matchId, verified_by_owner: true });
        if (error) throw error;
        setVenueMatches(prev => [...prev, { venue_id: venueId, match_id: matchId }]);
      }
    } catch (error) {
      console.error("Error toggling match:", error);
      alert("Failed to update. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  async function handleSaveBio(venueId: string) {
    setSavingBio(true);
    const { error } = await supabase.from('venues').update({ bio: bioInput }).eq('id', venueId);
    if (error) { alert('Failed to save bio.'); }
    else {
      setVenueBios(prev => ({ ...prev, [venueId]: bioInput }));
      setEditingBio(null);
    }
    setSavingBio(false);
  }
  async function handleImageUpload(venueId: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(venueId);
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
      setVenueImages(prev => ({ ...prev, [venueId]: publicUrl }));
    } catch {
      alert('Failed to upload image.');
    } finally {
      setUploadingImage(null);
    }
  }

  async function handleRemoveImage(venueId: string) {
    await supabase.from('venues').update({ image_url: null }).eq('id', venueId);
    setVenueImages(prev => { const n = { ...prev }; delete n[venueId]; return n; });
  }
  async function tickAll(venueId: string, venueMatchIds: string[]) {
    const toAdd = filteredMatches.filter(m => !venueMatchIds.includes(m.id));
    if (toAdd.length === 0) return;

    const rows = toAdd.map(m => ({
      venue_id: venueId,
      match_id: m.id,
      verified_by_owner: true,
    }));

    const { error } = await supabase
      .from("venue_matches")
      .upsert(rows, { onConflict: 'venue_id,match_id' });

    if (error) {
      alert("Failed to tick all. Please try again.");
      return;
    }

    setVenueMatches(prev => [
      ...prev,
      ...toAdd.map(m => ({ venue_id: venueId, match_id: m.id }))
    ]);
  }
  async function toggleDefault(venueId: string) {
    if (selectedLeague === 'all' && !searchQuery.trim()) return;

    const league = selectedLeague !== 'all' ? selectedLeague : null;
    const team = searchQuery.trim() || null;

    const existing = venueDefaults.find(d =>
      d.venue_id === venueId &&
      d.league === league &&
      d.team === team
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
  async function untickAll(venueId: string, venueMatchIds: string[]) {
    const toRemove = filteredMatches.filter(m => venueMatchIds.includes(m.id));
    if (toRemove.length === 0) return;

    const toRemoveIds = toRemove.map(m => m.id);

    const { error } = await supabase
      .from("venue_matches")
      .delete()
      .eq("venue_id", venueId)
      .in("match_id", toRemoveIds);

    if (error) {
      alert("Failed to untick all. Please try again.");
      return;
    }

    setVenueMatches(prev => prev.filter(
      vm => !(vm.venue_id === venueId && toRemoveIds.includes(vm.match_id))
    ));
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to home
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">Manage Your Venues</h1>
          <p className="text-gray-400">Update which matches you're showing</p>
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

        {/* Venues */}
        <div className="space-y-6">
          {userVenues.map((userVenue) => {
            const venue = userVenue.venues;
            const venueMatchIds = venueMatches
              .filter(vm => vm.venue_id === venue.id)
              .map(vm => vm.match_id);

            const allFilteredTicked = filteredMatches.every(m => venueMatchIds.includes(m.id));

            return (
              <div key={venue.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-1">{venue.name}</h2>
                  <p className="text-gray-400 mb-4">{venue.neighborhood}</p>
                  {/* Bio */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-2">Bar Description</p>
                    {editingBio === venue.id ? (
                      <div>
                        <textarea
                          value={bioInput}
                          onChange={(e) => setBioInput(e.target.value.slice(0, 500))}
                          placeholder="Tell fans about your bar..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 text-sm"
                          rows={3}
                          maxLength={500}
                        />
                        <p className="text-xs text-gray-500 text-right mb-2">{bioInput.length}/500</p>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveBio(venue.id)} disabled={savingBio} className="bg-blue-600 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all">
                            {savingBio ? 'Saving...' : 'Save'}
                          </button>
                          <button onClick={() => setEditingBio(null)} className="bg-white/10 text-white px-4 py-1.5 rounded-full text-sm font-bold hover:bg-white/20 transition-all">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <p className="text-sm text-gray-300 flex-1">{venueBios[venue.id] || <span className="text-gray-500 italic">No description yet</span>}</p>
                        <button onClick={() => { setEditingBio(venue.id); setBioInput(venueBios[venue.id] || ''); }} className="text-xs text-blue-400 hover:text-blue-300 flex-shrink-0">
                          {venueBios[venue.id] ? 'Edit' : 'Add description'}
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Cover Photo */}
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 uppercase font-bold tracking-wide mb-2">Cover Photo</p>
                    {venueImages[venue.id] ? (
                      <div className="relative inline-block">
                        <img src={venueImages[venue.id]} alt={venue.name} className="w-full h-40 object-cover rounded-xl" />
                        <div className="absolute bottom-2 right-2 flex gap-2">
                          <label className="bg-black/60 hover:bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer transition-all">
                            {uploadingImage === venue.id ? 'Uploading...' : '📷 Change'}
                            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImageUpload(venue.id, e)} className="hidden" disabled={uploadingImage === venue.id} />
                          </label>
                          <button onClick={() => handleRemoveImage(venue.id)} className="bg-red-600/70 hover:bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all">✕ Remove</button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center h-28 bg-white/5 border border-white/10 border-dashed rounded-xl cursor-pointer hover:bg-white/10 transition-all">
                        <span className="text-2xl mb-1">📷</span>
                        <span className="text-sm text-gray-400 font-semibold">{uploadingImage === venue.id ? 'Uploading...' : 'Add a cover photo'}</span>
                        <span className="text-xs text-gray-600 mt-1">JPG or PNG recommended</span>
                        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => handleImageUpload(venue.id, e)} className="hidden" disabled={uploadingImage === venue.id} />
                      </label>
                    )}
                  </div>
                </div>

                {filteredMatches.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No matches found</p>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide">
                        {filteredMatches.length} matches
                      </h3>
                      <div className="flex gap-3 flex-wrap">
                        {selectedLeague !== 'all' || searchQuery.trim() ? (() => {
                          const league = selectedLeague !== 'all' ? selectedLeague : null;
                          const team = searchQuery.trim() || null;
                          const isDefault = venueDefaults.some(d =>
                            d.venue_id === venue.id && d.league === league && d.team === team
                          );
                          return (
                            <button
                              onClick={() => toggleDefault(venue.id)}
                              className={`text-sm font-semibold transition-colors ${
                                isDefault
                                  ? 'text-green-400 hover:text-red-400'
                                  : 'text-gray-400 hover:text-green-400'
                              }`}
                            >
                              {isDefault ? '★ Default (click to remove)' : '☆ Set as default'}
                            </button>
                          );
                        })() : null}
                        {!allFilteredTicked && (
                          <button
                            onClick={() => tickAll(venue.id, venueMatchIds)}
                            className="text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            ✓ Tick all
                          </button>
                        )}
                        {venueMatchIds.some(id => filteredMatches.map(m => m.id).includes(id)) && (
                          <button
                            onClick={() => untickAll(venue.id, venueMatchIds)}
                            className="text-sm font-semibold text-red-400 hover:text-red-300 transition-colors"
                          >
                            ✗ Untick all
                          </button>
                        )}
                      </div>
                    </div>
                    {filteredMatches.map((match) => {
                      const isShowing = venueMatchIds.includes(match.id);
                      const isSaving = saving === `${venue.id}-${match.id}`;
                      
                      return (
                        <div key={match.id} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-white mb-1 truncate">
                                {match.home_team} vs {match.away_team}
                              </p>
                              <p className="text-sm text-gray-400">
                                {match.league} • {new Date(match.kickoff_time).toLocaleString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                  hour: "numeric",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                            <label className="flex items-center gap-3 cursor-pointer flex-shrink-0">
                              <span className="text-sm font-semibold text-gray-300 hidden sm:inline">
                                {isSaving ? "Saving..." : "We're showing this"}
                              </span>
                              <input
                                type="checkbox"
                                checked={isShowing}
                                disabled={isSaving}
                                onChange={() => toggleMatch(venue.id, match.id, isShowing)}
                                className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}