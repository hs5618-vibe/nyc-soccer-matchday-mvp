import { supabase } from "./supabaseClient";

export type Venue = {
  id: string;
  name: string;
  neighborhood: string;
  bar_type: string;
  club_name: string | null;
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