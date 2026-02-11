import { supabase } from "./supabaseClient";

export async function getUpvoteCount(updateId: string): Promise<number> {
  const { count, error } = await supabase
    .from("update_upvotes")
    .select("*", { count: "exact", head: true })
    .eq("update_id", updateId);

  if (error) {
    console.error("Error fetching upvote count:", error);
    return 0;
  }

  return count || 0;
}

export async function hasUserUpvoted(updateId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("update_upvotes")
    .select("id")
    .eq("update_id", updateId)
    .eq("user_id", userId)
    .single();

  if (error) return false;
  return !!data;
}

export async function toggleUpvote(updateId: string, userId: string): Promise<{ upvoted: boolean; count: number }> {
  // Check if already upvoted
  const alreadyUpvoted = await hasUserUpvoted(updateId, userId);

  if (alreadyUpvoted) {
    // Remove upvote
    const { error } = await supabase
      .from("update_upvotes")
      .delete()
      .eq("update_id", updateId)
      .eq("user_id", userId);

    if (error) throw error;

    const count = await getUpvoteCount(updateId);
    return { upvoted: false, count };
  } else {
    // Add upvote
    const { error } = await supabase
      .from("update_upvotes")
      .insert({
        update_id: updateId,
        user_id: userId,
      });

    if (error) throw error;

    const count = await getUpvoteCount(updateId);
    return { upvoted: true, count };
  }
}

export async function getUpvotesForUpdates(updateIds: string[]): Promise<Record<string, number>> {
  if (updateIds.length === 0) return {};

  const { data, error } = await supabase
    .from("update_upvotes")
    .select("update_id")
    .in("update_id", updateIds);

  if (error) {
    console.error("Error fetching upvotes:", error);
    return {};
  }

  // Count upvotes per update
  const counts: Record<string, number> = {};
  updateIds.forEach(id => counts[id] = 0);
  
  (data || []).forEach(upvote => {
    counts[upvote.update_id] = (counts[upvote.update_id] || 0) + 1;
  });

  return counts;
}

export async function getUserUpvotes(userId: string, updateIds: string[]): Promise<Set<string>> {
  if (updateIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from("update_upvotes")
    .select("update_id")
    .eq("user_id", userId)
    .in("update_id", updateIds);

  if (error) {
    console.error("Error fetching user upvotes:", error);
    return new Set();
  }

  return new Set((data || []).map(u => u.update_id));
}