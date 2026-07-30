"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchSavedBars, unsaveBar, type SavedBar } from "@/lib/savedBars";
import { fetchSavedTeams, unsaveTeam } from "@/lib/savedTeams";
import { fetchAttendedMatches, isMatchAttended, markMatchAttended, unmarkMatchAttended, type AttendedMatch } from "@/lib/attendedMatches";
import { fetchRecentPastMatches, formatMatchTime, type Match } from "@/lib/matches";

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [savedBars, setSavedBars] = useState<SavedBar[]>([]);
  const [savedTeams, setSavedTeams] = useState<string[]>([]);
  const [attendedMatches, setAttendedMatches] = useState<AttendedMatch[]>([]);
  const [recentMatches, setRecentMatches] = useState<Match[]>([]);
  const [attendedIds, setAttendedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      const [bars, teams, attended, recent] = await Promise.all([
        fetchSavedBars(user.id),
        fetchSavedTeams(user.id),
        fetchAttendedMatches(user.id),
        fetchRecentPastMatches(),
      ]);

      setSavedBars(bars);
      setSavedTeams(teams);
      setAttendedMatches(attended);
      setRecentMatches(recent);

      const attendedMap: Record<string, boolean> = {};
      attended.forEach((m) => { attendedMap[m.id] = true; });
      setAttendedIds(attendedMap);

      setLoading(false);
    }
    load();
  }, [router]);

  async function handleUnsaveBar(venueId: string) {
    if (!user) return;
    setSavedBars(prev => prev.filter(b => b.id !== venueId));
    await unsaveBar(user.id, venueId);
  }

  async function handleUnsaveTeam(team: string) {
    if (!user) return;
    setSavedTeams(prev => prev.filter(t => t !== team));
    await unsaveTeam(user.id, team);
  }

  async function toggleAttended(matchId: string) {
    if (!user) return;
    const isAttended = !!attendedIds[matchId];

    setAttendedIds(prev => ({ ...prev, [matchId]: !isAttended }));

    if (isAttended) {
      await unmarkMatchAttended(user.id, matchId);
      setAttendedMatches(prev => prev.filter(m => m.id !== matchId));
    } else {
      await markMatchAttended(user.id, matchId);
      const match = recentMatches.find(m => m.id === matchId);
      if (match) {
        setAttendedMatches(prev => [
          { id: match.id, home_team: match.home_team, away_team: match.away_team, league: match.league, kickoff_time: match.kickoff_time },
          ...prev,
        ]);
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#10141C] to-[#0A0D12] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#10141C] to-[#0A0D12] font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-sm text-brand-green-400 hover:text-brand-green-100 font-medium inline-flex items-center gap-1 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
          <h1 className="text-3xl font-black text-white">Your Profile</h1>
          <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
        </div>

        {/* Saved Teams */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">⭐ Teams You Follow</h2>
          {savedTeams.length === 0 ? (
            <p className="text-gray-500 text-sm">No saved teams yet. Star a team from the homepage to follow it here.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {savedTeams.map(team => (
                <div
                  key={team}
                  className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm font-semibold text-white"
                >
                  {team}
                  <button
                    onClick={() => handleUnsaveTeam(team)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    aria-label={`Unfollow ${team}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Bars */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">❤️ Your Saved Bars</h2>
          {savedBars.length === 0 ? (
            <p className="text-gray-500 text-sm">No saved bars yet. Save a bar from its venue page to see it here.</p>
          ) : (
            <div className="space-y-2">
              {savedBars.map(bar => (
                <div
                  key={bar.id}
                  className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl p-3"
                >
                  <Link href={`/venue/${bar.id}`} className="text-sm font-semibold text-white hover:text-brand-green-400 transition-colors">
                    {bar.name}
                  </Link>
                  <button
                    onClick={() => handleUnsaveBar(bar.id)}
                    className="text-gray-500 hover:text-red-400 text-xs font-semibold transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Attended Matches */}
        <div className="mb-10">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">✅ Matches You've Attended</h2>
          <p className="text-gray-500 text-xs mb-4">
            Mark matches from the last 30 days as attended. This is manual — just toggle the ones you actually watched.
          </p>

          {recentMatches.length === 0 ? (
            <p className="text-gray-500 text-sm">No recent matches to mark yet — check back after some matches have kicked off.</p>
          ) : (
            <div className="space-y-2">
              {recentMatches.map(match => {
                const attended = !!attendedIds[match.id];
                return (
                  <div
                    key={match.id}
                    className={`flex items-center justify-between gap-3 border rounded-xl p-3 transition-all ${
                      attended ? "bg-brand-green/10 border-brand-green-600/30" : "bg-white/5 border-white/10"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {match.home_team} vs {match.away_team}
                      </p>
                      <p className="text-xs text-gray-400">{formatMatchTime(match.kickoff_time)} · {match.league}</p>
                    </div>
                    <button
                      onClick={() => toggleAttended(match.id)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        attended
                          ? "bg-brand-green text-white"
                          : "bg-white/10 text-gray-300 hover:bg-white/20"
                      }`}
                    >
                      {attended ? "✓ Attended" : "Mark attended"}
                    </button>
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