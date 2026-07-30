import { supabase } from "./supabaseClient";

export type AttendedMatch = {
  id: string; // match_id
  home_team: string;
  away_team: string;
  league: string;
  kickoff_time: string;
};

export async function fetchAttendedMatches(userId: string): Promise<AttendedMatch[]> {
  const { data, error } = await supabase
    .from("attended_matches")
    .select(`
      match_id,
      matches (
        id,
        home_team,
        away_team,
        league,
        kickoff_time
      )
    `)
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching attended matches:", error);
    return [];
  }

  return (data || [])
    .map((row: any) => row.matches)
    .filter(Boolean)
    .sort((a: any, b: any) => (a.kickoff_time < b.kickoff_time ? 1 : -1));
}

export async function isMatchAttended(userId: string, matchId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("attended_matches")
    .select("id")
    .eq("user_id", userId)
    .eq("match_id", matchId)
    .maybeSingle();

  if (error) {
    console.error("Error checking attended match:", error);
    return false;
  }

  return !!data;
}

export async function markMatchAttended(userId: string, matchId: string): Promise<boolean> {
  const { error } = await supabase
    .from("attended_matches")
    .upsert(
      { user_id: userId, match_id: matchId },
      { onConflict: "user_id,match_id" }
    );

  if (error) {
    console.error("Error marking match attended:", error);
    return false;
  }

  return true;
}

export async function unmarkMatchAttended(userId: string, matchId: string): Promise<boolean> {
  const { error } = await supabase
    .from("attended_matches")
    .delete()
    .eq("user_id", userId)
    .eq("match_id", matchId);

  if (error) {
    console.error("Error unmarking match attended:", error);
    return false;
  }

  return true;
}