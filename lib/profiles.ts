import { supabase } from "./supabaseClient";

export type UserProfile = {
  user_id: string;
  username: string;
  bars_visited: number;
  reputation_score: number;
  created_at: string;
  updated_at: string;
};

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }

  return data;
}

export async function createProfile(userId: string, username: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      username: username,
      bars_visited: 0,
      reputation_score: 0,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating profile:", error);
    throw error;
  }

  return data;
}

export async function updateUsername(userId: string, username: string): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .update({ username, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (error) {
    console.error("Error updating username:", error);
    return false;
  }

  return true;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", username)
    .single();

  if (error && error.code === "PGRST116") {
    // Not found = available
    return true;
  }

  return !data;
}

export async function reportUpdate(updateId: string, reportedBy: string, reason: string) {
  const { data, error } = await supabase
    .from("reports")
    .insert({
      update_id: updateId,
      reported_by: reportedBy,
      reason: reason,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating report:", error);
    throw error;
  }

  return data;
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
        user_id
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

export async function reviewReport(reportId: string, reviewerId: string, newStatus: 'reviewed' | 'dismissed') {
  const { error } = await supabase
    .from("reports")
    .update({
      status: newStatus,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId,
    })
    .eq("id", reportId);

  if (error) {
    console.error("Error reviewing report:", error);
    throw error;
  }

  return { success: true };
}