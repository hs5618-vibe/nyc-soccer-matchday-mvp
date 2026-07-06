import { supabase } from "./supabaseClient";

export async function fetchSavedTeams(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("saved_teams")
    .select("team_name")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching saved teams:", error);
    return [];
  }

  return (data || []).map((row: any) => row.team_name);
}

export async function saveTeam(userId: string, teamName: string): Promise<boolean> {
  const { error } = await supabase
    .from("saved_teams")
    .upsert(
      { user_id: userId, team_name: teamName },
      { onConflict: "user_id,team_name" }
    );

  if (error) {
    console.error("Error saving team:", error);
    return false;
  }

  return true;
}

export async function unsaveTeam(userId: string, teamName: string): Promise<boolean> {
  const { error } = await supabase
    .from("saved_teams")
    .delete()
    .eq("user_id", userId)
    .eq("team_name", teamName);

  if (error) {
    console.error("Error unsaving team:", error);
    return false;
  }

  return true;
}