import { supabase } from "./supabaseClient";

export type Venue = {
  id: string;
  name: string;
  neighborhood: string;
  address: string | null;
  bar_type: string;
  club_name: string | null;

  // New: for "near me" + map
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

  return data as Venue;
}

export async function fetchVenuesByMatch(matchId: string): Promise<Venue[]> {
  const { data, error } = await supabase
    .from("venue_matches")
    .select(
      `
      venue_id,
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
    `
    )
    .eq("match_id", matchId);

  if (error) {
    console.error("Error fetching venues by match:", error);
    return [];
  }

  // Extract venues from the joined data + remove nulls with a type guard
  const venues = (data || [])
    .map((item: any) => item.venues as Venue | null)
    .filter((v): v is Venue => v !== null);

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

  return (data || []) as Venue[];
}