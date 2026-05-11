import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminRow } = await supabaseAdmin
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!adminRow) return NextResponse.json({ error: "Not an admin" }, { status: 403 });

  const { submissionId } = await req.json();
  if (!submissionId) return NextResponse.json({ error: "Missing submissionId" }, { status: 400 });

  const { data: sub, error: subError } = await supabaseAdmin
    .from("bar_submissions")
    .select("*")
    .eq("id", submissionId)
    .single();

  if (subError || !sub) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

  const venueId = sub.bar_name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 50) + "-" + Date.now().toString(36);

  const { error: venueError } = await supabaseAdmin.from("venues").insert({
    id: venueId,
    name: sub.bar_name,
    address: sub.address,
    neighborhood: sub.neighborhood || "Other",
    borough: sub.borough || null,
    bio: sub.bio || null,
    instagram: sub.instagram || null,
    bar_type: "bar",
    claimed: true,
    verified: false,
  });

  if (venueError) {
    return NextResponse.json({ error: `Failed to create venue: ${venueError.message}` }, { status: 500 });
  }

  const leagueMap: Record<string, string> = {
    "World Cup": "World Cup",
    "Champions League": "Champions League",
    "Premier League": "Premier League",
    "La Liga": "La Liga",
    "Serie A": "Serie A",
    "Bundesliga": "Bundesliga",
    "Ligue 1": "Ligue 1",
    "Eredivisie": "Eredivisie",
    "Primeira Liga": "Primeira Liga",
    "Brasileirao": "Brasileirao",
    "Championship": "Championship",
    "MLS": "MLS",
  };

  const leagues: string[] = (sub.leagues || [])
    .map((l: string) => leagueMap[l])
    .filter(Boolean);

  if (sub.show_world_cup && !leagues.includes("World Cup")) {
    leagues.unshift("World Cup");
  }

  if (leagues.length > 0) {
    const defaults = leagues.map((league: string) => ({
      venue_id: venueId,
      competition_name: league,
    }));
    await supabaseAdmin.from("venue_defaults").insert(defaults);
  }

  const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    sub.contact_email,
    {
      data: {
        full_name: sub.contact_name || "",
        venue_id: venueId,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://awaydayz.co"}/manage`,
    }
  );

  let ownerId: string | null = inviteData?.user?.id || null;

  if (!ownerId) {
    const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
    const existing = users.find((u: any) => u.email === sub.contact_email);
    ownerId = existing?.id || null;
  }

  if (ownerId) {
    await supabaseAdmin.from("venue_admins").insert({
      venue_id: venueId,
      user_id: ownerId,
    });
  }

  await supabaseAdmin
    .from("bar_submissions")
    .update({ status: "approved" })
    .eq("id", submissionId);

  return NextResponse.json({
    success: true,
    venueId,
    message: `${sub.bar_name} is now live. Owner notified at ${sub.contact_email}.`,
  });
}
