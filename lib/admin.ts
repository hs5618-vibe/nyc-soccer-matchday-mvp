import { supabase } from "./supabaseClient";

export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) return false;
  return !!data;
}

export type VenueClaim = {
  id: string;
  venue_id: string;
  user_id: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  status: string;
  created_at: string;
  venues: {
    name: string;
    neighborhood: string;
  } | null;
};

export async function getPendingClaims(): Promise<VenueClaim[]> {
  const { data, error } = await supabase
    .from("venue_claims")
    .select(`
      *,
      venues (
        name,
        neighborhood
      )
    `)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching claims:", error);
    return [];
  }

  return (data || []).map(item => ({
    ...item,
    venues: Array.isArray(item.venues) ? item.venues[0] : item.venues
  })) as VenueClaim[];
}

export async function getAllVenueAdmins() {
  const { data, error } = await supabase
    .from("venue_admins")
    .select(`
      venue_id,
      user_id,
      added_at,
      venues (
        name,
        neighborhood
      )
    `)
    .order("added_at", { ascending: false });

  if (error) {
    console.error("Error fetching venue admins:", error);
    return [];
  }

  return (data || []).map(item => ({
    ...item,
    venues: Array.isArray(item.venues) ? item.venues[0] : item.venues
  }));
}

export async function approveClaim(claimId: string, userId: string, venueId: string) {
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  
  // Update claim status
  const { error: claimError } = await supabase
    .from("venue_claims")
    .update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: currentUser?.id || null,
    })
    .eq("id", claimId);

  if (claimError) throw claimError;

  // Add to venue_admins
  const { error: adminError } = await supabase
    .from("venue_admins")
    .insert({
      venue_id: venueId,
      user_id: userId,
    });

  if (adminError) throw adminError;

  return { success: true };
}

export async function rejectClaim(claimId: string, reviewerId: string) {
  const { error } = await supabase
    .from("venue_claims")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq("id", claimId);

  if (error) throw error;
  return { success: true };
}

export async function getAdminStats() {
  const [venues, claims, admins, showings] = await Promise.all([
    supabase.from("venues").select("id", { count: "exact", head: true }),
    supabase.from("venue_claims").select("id", { count: "exact", head: true }),
    supabase.from("venue_admins").select("user_id", { count: "exact", head: true }),
    supabase.from("showings").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalVenues: venues.count || 0,
    totalClaims: claims.count || 0,
    totalAdmins: admins.count || 0,
    totalShowings: showings.count || 0,
  };
}

export async function getPendingReports() {
    const { data, error } = await supabase
      .from("reports")
      .select(`
        *,
        updates (
          id,
          message,
          created_at,
          user_id,
          match_id,
          venue_id
        )
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
  
    if (error) {
      console.error("Error fetching reports:", error);
      return [];
    }
  
    return data || [];
  }
  
  export async function reviewReport(reportId: string, reviewerId: string, action: 'dismiss' | 'delete') {
    // Update report status
    const { error: reportError } = await supabase
      .from("reports")
      .update({
        status: action === 'dismiss' ? 'dismissed' : 'reviewed',
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
      })
      .eq("id", reportId);
  
    if (reportError) throw reportError;
  
    // If action is delete, delete the update
    if (action === 'delete') {
      const { data: report } = await supabase
        .from("reports")
        .select("update_id")
        .eq("id", reportId)
        .single();
  
      if (report?.update_id) {
        const { error: deleteError } = await supabase
          .from("updates")
          .delete()
          .eq("id", report.update_id);
  
        if (deleteError) throw deleteError;
      }
    }
  
    return { success: true };
  }