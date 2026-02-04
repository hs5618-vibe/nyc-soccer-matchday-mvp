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