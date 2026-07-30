import { supabase } from "./supabaseClient";

export type Group = {
  id: string;
  name: string;
  team_name: string;
  description: string | null;
  instagram: string | null;
  created_by: string;
  created_at: string;
};

export async function fetchAllGroups(): Promise<Group[]> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching groups:", error);
    return [];
  }

  return data || [];
}

export async function fetchGroupById(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .single();

  if (error) {
    console.error("Error fetching group:", error);
    return null;
  }

  return data;
}

export async function createGroup({
  name,
  teamName,
  description,
  instagram,
  userId,
}: {
  name: string;
  teamName: string;
  description: string;
  instagram: string;
  userId: string;
}): Promise<Group | null> {
  const { data, error } = await supabase
    .from("groups")
    .insert({
      name,
      team_name: teamName,
      description: description || null,
      instagram: instagram || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating group:", error);
    return null;
  }

  // Creating a group automatically makes the creator its first member.
  await supabase.from("group_members").insert({ group_id: data.id, user_id: userId });

  return data;
}

export async function deleteGroup(groupId: string): Promise<boolean> {
  const { error } = await supabase
    .from("groups")
    .delete()
    .eq("id", groupId);

  if (error) {
    console.error("Error deleting group:", error);
    return false;
  }

  return true;
}
export async function fetchMemberCount(groupId: string): Promise<number> {
  const { count, error } = await supabase
    .from("group_members")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId);

  if (error) {
    console.error("Error fetching member count:", error);
    return 0;
  }

  return count || 0;
}

export async function isGroupMember(groupId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("group_members")
    .select("id")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error checking group membership:", error);
    return false;
  }

  return !!data;
}

export async function joinGroup(groupId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("group_members")
    .upsert(
      { group_id: groupId, user_id: userId },
      { onConflict: "group_id,user_id" }
    );

  if (error) {
    console.error("Error joining group:", error);
    return false;
  }

  return true;
}

export async function leaveGroup(groupId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error leaving group:", error);
    return false;
  }

  return true;
}

export async function fetchGroupVenues(groupId: string): Promise<{ id: string; name: string; neighborhood: string }[]> {
  const { data, error } = await supabase
    .from("group_venues")
    .select(`
      venue_id,
      venues (
        id,
        name,
        neighborhood
      )
    `)
    .eq("group_id", groupId);

  if (error) {
    console.error("Error fetching group venues:", error);
    return [];
  }

  return (data || [])
    .map((row: any) => row.venues)
    .filter(Boolean);
}

export async function linkVenueToGroup(groupId: string, venueId: string): Promise<boolean> {
  const { error } = await supabase
    .from("group_venues")
    .upsert(
      { group_id: groupId, venue_id: venueId },
      { onConflict: "group_id,venue_id" }
    );

  if (error) {
    console.error("Error linking venue to group:", error);
    return false;
  }

  return true;
}

export async function unlinkVenueFromGroup(groupId: string, venueId: string): Promise<boolean> {
  const { error } = await supabase
    .from("group_venues")
    .delete()
    .eq("group_id", groupId)
    .eq("venue_id", venueId);

  if (error) {
    console.error("Error unlinking venue from group:", error);
    return false;
  }

  return true;
}

// Reverse lookup, used on venue pages to show which supporter groups call this venue home.
export async function fetchGroupsByVenue(venueId: string): Promise<Group[]> {
  const { data, error } = await supabase
    .from("group_venues")
    .select(`
      group_id,
      groups (
        id,
        name,
        team_name,
        description,
        instagram,
        created_by,
        created_at
      )
    `)
    .eq("venue_id", venueId);

  if (error) {
    console.error("Error fetching groups by venue:", error);
    return [];
  }

  return (data || [])
    .map((row: any) => row.groups)
    .filter(Boolean);
}