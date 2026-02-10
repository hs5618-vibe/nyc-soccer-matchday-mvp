import { supabase } from "./supabaseClient";

export type Match = {
  id: string;
  league: string;
  home_team: string;
  away_team: string;
  home_team_crest: string | null;
  away_team_crest: string | null;
  kickoff_time: string;
  status: 'upcoming' | 'live' | 'finished';
};

export async function fetchUpcomingMatches(): Promise<Match[]> {
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(now.getDate() + 30);

  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("status", "upcoming")
    .gte("kickoff_time", now.toISOString())
    .lte("kickoff_time", thirtyDaysFromNow.toISOString())
    .order("kickoff_time", { ascending: true })
    .limit(20);

  if (error) {
    console.error("Error fetching matches:", error);
    return [];
  }

  return data || [];
}

export async function fetchMatchById(matchId: string): Promise<Match | null> {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error) {
    console.error("Error fetching match:", error);
    return null;
  }

  return data;
}

export function formatMatchTime(kickoffTime: string): string {
  const date = new Date(kickoffTime);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayName = days[date.getDay()];
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  
  return `${dayName}, ${new Date(kickoffTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} • ${displayHours}:${displayMinutes} ${ampm}`;
}