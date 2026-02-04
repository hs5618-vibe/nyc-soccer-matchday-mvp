import { supabase } from "./supabaseClient";

export async function fetchGoingCount({ matchId, venueId }: { matchId: string; venueId: string }): Promise<number> {
  const { count, error } = await supabase
    .from("going")
    .select("*", { count: "exact", head: true })
    .eq("match_id", matchId)
    .eq("venue_id", venueId);

  if (error) {
    console.error("Error fetching going count:", error);
    return 0;
  }

  return count || 0;
}

export async function hasUserGone({ matchId, venueId, userId }: { matchId: string; venueId: string; userId: string }): Promise<boolean> {
  const { data, error } = await supabase
    .from("going")
    .select("*")
    .eq("match_id", matchId)
    .eq("venue_id", venueId)
    .eq("user_id", userId)
    .single();

  if (error) {
    return false;
  }

  return !!data;
}

export async function insertGoing({ matchId, venueId, userId }: { matchId: string; venueId: string; userId: string }): Promise<boolean> {
  const { error } = await supabase
    .from("going")
    .insert({
      match_id: matchId,
      venue_id: venueId,
      user_id: userId,
    });

  if (error) {
    console.error("Error inserting going:", error);
    return false;
  }

  return true;
}