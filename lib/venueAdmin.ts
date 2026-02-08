import { supabase } from "./supabaseClient";

export type UserVenue = {
  venue_id: string;
  venues: {
    id: string;
    name: string;
    neighborhood: string;
    bar_type: string;
    club_name: string | null;
  };
};

export async function isVenueAdmin(userId: string, venueId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("venue_admins")
    .select("*")
    .eq("user_id", userId)
    .eq("venue_id", venueId)
    .single();

  if (error) return false;
  return !!data;
}

export async function getUserVenues(userId: string): Promise<UserVenue[]> {
  const { data, error } = await supabase
    .from("venue_admins")
    .select(`
      venue_id,
      venues (
        id,
        name,
        neighborhood,
        bar_type,
        club_name
      )
    `)
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user venues:", error);
    return [];
  }

  // Transform the data to flatten the venues array
  const transformed = (data || []).map(item => ({
    venue_id: item.venue_id,
    venues: Array.isArray(item.venues) ? item.venues[0] : item.venues
  })).filter(item => item.venues) as UserVenue[];

  return transformed;
}

export async function claimVenue(venueId: string, businessInfo: {
  businessName: string;
  businessEmail: string;
  businessPhone: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Must be logged in to claim a venue");
  }

  const { data, error } = await supabase
    .from("venue_claims")
    .insert({
      venue_id: venueId,
      user_id: user.id,
      business_name: businessInfo.businessName,
      business_email: businessInfo.businessEmail,
      business_phone: businessInfo.businessPhone,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getVenueClaimStatus(userId: string, venueId: string) {
  const { data, error } = await supabase
    .from("venue_claims")
    .select("*")
    .eq("user_id", userId)
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error checking claim status:", error);
    return null;
  }

  return data;
}