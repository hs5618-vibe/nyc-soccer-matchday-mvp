import { createClient } from '@supabase/supabase-js';

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;
const PREMIER_LEAGUE_ID = 2021;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

type FootballDataMatch = {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { 
    name: string;
    crest: string;
  };
  awayTeam: { 
    name: string;
    crest: string;
  };
};

export async function syncMatchesFromAPI() {
  if (!FOOTBALL_DATA_API_KEY) {
    console.error("FOOTBALL_DATA_API_KEY not set");
    return { success: false, error: "API key missing" };
  }

  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = thirtyDaysFromNow.toISOString().split('T')[0];

    console.log(`Fetching matches from ${dateFrom} to ${dateTo}...`);

    const response = await fetch(
      `https://api.football-data.org/v4/competitions/${PREMIER_LEAGUE_ID}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
      {
        headers: {
          'X-Auth-Token': FOOTBALL_DATA_API_KEY,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const matches: FootballDataMatch[] = data.matches || [];

    console.log(`Found ${matches.length} matches from API`);

    const matchesToInsert = matches
      .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
      .map(match => ({
        id: `epl-${match.id}`,
        league: 'Premier League',
        home_team: match.homeTeam.name,
        away_team: match.awayTeam.name,
        home_team_crest: match.homeTeam.crest,
        away_team_crest: match.awayTeam.crest,
        kickoff_time: match.utcDate,
        status: 'upcoming',
      }));

    if (matchesToInsert.length === 0) {
      console.log("No upcoming matches to insert");
      return { success: true, count: 0 };
    }

    const { data: upsertedMatches, error } = await supabaseAdmin
      .from('matches')
      .upsert(matchesToInsert, { onConflict: 'id' })
      .select();

    if (error) {
      console.error("Error upserting matches:", error);
      return { success: false, error: error.message };
    }

    console.log(`Successfully synced ${upsertedMatches?.length || 0} matches`);

    const { error: updateError } = await supabaseAdmin
      .from('matches')
      .update({ status: 'finished' })
      .lt('kickoff_time', today.toISOString())
      .eq('status', 'upcoming');

    if (updateError) {
      console.warn("Error updating old matches:", updateError);
    }

    return { 
      success: true, 
      count: upsertedMatches?.length || 0,
      message: `Synced ${upsertedMatches?.length || 0} matches`
    };

  } catch (error: any) {
    console.error("Error syncing matches:", error);
    return { success: false, error: error.message };
  }
}