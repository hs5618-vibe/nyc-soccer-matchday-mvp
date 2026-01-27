import { supabase } from "./supabaseClient";

export type VenueJoin = {
  id: string;
  name: string;
  neighborhood: string;
  bar_type: string;
  club_name: string | null;
};

export type ShowingRow = {
  venue_id: string;
  status: "showing" | "not_showing";
  note: string | null;
  venue: VenueJoin | null;
};

type ShowingRowRaw = {
  venue_id: any;
  status: any;
  note: any;
  venues: VenueJoin[];
};

export async function fetchShowingsForMatch(matchId: string): Promise<ShowingRow[]> {
  const { data, error } = await supabase
    .from("showings")
    .select(
      `
      venue_id,
      status,
      note,
      venues (
        id,
        name,
        neighborhood,
        bar_type,
        club_name
      )
    `
    )
    .eq("match_id", matchId);

  if (error) throw error;

  const rows = (data ?? []) as unknown as ShowingRowRaw[];

  return rows.map((r) => ({
    venue_id: r.venue_id,
    status: r.status,
    note: r.note,
    venue: r.venues?.[0] ?? null,
  }));
}