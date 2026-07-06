import { supabase } from "./supabaseClient";

export type SavedBar = {
  id: string; // venue_id
  name: string;
};

export async function fetchSavedBars(userId: string): Promise<SavedBar[]> {
  const { data, error } = await supabase
    .from("saved_bars")
    .select(`
      venue_id,
      venues (
        id,
        name
      )
    `)
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching saved bars:", error);
    return [];
  }

  return (data || [])
    .map((row: any) => row.venues)
    .filter(Boolean)
    .map((v: any) => ({ id: v.id, name: v.name }));
}

export async function isBarSaved(userId: string, venueId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("saved_bars")
    .select("id")
    .eq("user_id", userId)
    .eq("venue_id", venueId)
    .maybeSingle();

  if (error) {
    console.error("Error checking saved bar:", error);
    return false;
  }

  return !!data;
}

export async function saveBar(userId: string, venueId: string): Promise<boolean> {
  const { error } = await supabase
    .from("saved_bars")
    .upsert(
      { user_id: userId, venue_id: venueId },
      { onConflict: "user_id,venue_id" }
    );

  if (error) {
    console.error("Error saving bar:", error);
    return false;
  }

  return true;
}

export async function unsaveBar(userId: string, venueId: string): Promise<boolean> {
  const { error } = await supabase
    .from("saved_bars")
    .delete()
    .eq("user_id", userId)
    .eq("venue_id", venueId);

  if (error) {
    console.error("Error unsaving bar:", error);
    return false;
  }

  return true;
}