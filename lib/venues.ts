import { supabase } from "./supabaseClient";

export type Venue = {
  id: string;
  name: string;
  neighborhood: string;
  address: string | null;
  bar_type: string;
  club_name: string | null;

  // ✅ optional geo fields (null until you backfill)
  latitude: number | null;
  longitude: number | null;
};

export async function fetchVenueById(venueId: string): Promise<Venue | null> {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("id", venueId)
    .single();

  if (error) {
    console.error("Error fetching venue:", error);
    return null;
  }

  return data;
}

export async function fetchVenuesByMatch(matchId: string): Promise<Venue[]> {
  const { data, error } = await supabase
    .from("venue_matches")
    .select(`
      venue_id,
      verified_by_owner,
      venues (
        id,
        name,
        neighborhood,
        address,
        bar_type,
        club_name,
        latitude,
        longitude
      )
    `)
    .eq("match_id", matchId);

  if (error) {
    console.error("Error fetching venues by match:", error);
    return [];
  }

  const venues = (data || [])
    .map((item: any) => ({
      ...item.venues,
      verified_by_owner: item.verified_by_owner ?? false,
    }))
    .filter((venue: any) => venue !== null);

  return venues;
}

export async function fetchAllVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .order("name");

  if (error) {
    console.error("Error fetching all venues:", error);
    return [];
  }

  return data || [];
}