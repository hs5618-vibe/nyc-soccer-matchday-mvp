import { createClient } from '@supabase/supabase-js';

const FOOTBALL_DATA_API_KEY = process.env.FOOTBALL_DATA_API_KEY;

// League IDs from Football-Data.org
const LEAGUES = {
  PREMIER_LEAGUE: 2021,
  LA_LIGA: 2014,
  BUNDESLIGA: 2002,
  SERIE_A: 2019,
  LIGUE_1: 2015,
  CHAMPIONS_LEAGUE: 2001,
};

const LEAGUE_NAMES = {
  [LEAGUES.PREMIER_LEAGUE]: 'Premier League',
  [LEAGUES.LA_LIGA]: 'La Liga',
  [LEAGUES.BUNDESLIGA]: 'Bundesliga',
  [LEAGUES.SERIE_A]: 'Serie A',
  [LEAGUES.LIGUE_1]: 'Ligue 1',
  [LEAGUES.CHAMPIONS_LEAGUE]: 'Champions League',
};

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

    let allMatchesToInsert: any[] = [];

    // Fetch matches for each league
    for (const [leagueKey, leagueId] of Object.entries(LEAGUES)) {
      console.log(`Fetching ${LEAGUE_NAMES[leagueId]} matches...`);

      const response = await fetch(
        `https://api.football-data.org/v4/competitions/${leagueId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
        {
          headers: {
            'X-Auth-Token': FOOTBALL_DATA_API_KEY,
          },
        }
      );

      if (!response.ok) {
        console.error(`API error for ${LEAGUE_NAMES[leagueId]}: ${response.status}`);
        continue; // Skip this league and continue with others
      }

      const data = await response.json();
      const matches: FootballDataMatch[] = data.matches || [];

      console.log(`Found ${matches.length} matches for ${LEAGUE_NAMES[leagueId]}`);

      const matchesToInsert = matches
        .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
        .map(match => ({
          id: `${leagueKey.toLowerCase()}-${match.id}`,
          league: LEAGUE_NAMES[leagueId],
          home_team: match.homeTeam.name,
          away_team: match.awayTeam.name,
          home_team_crest: match.homeTeam.crest,
          away_team_crest: match.awayTeam.crest,
          kickoff_time: match.utcDate,
          status: 'upcoming',
        }));

      allMatchesToInsert = [...allMatchesToInsert, ...matchesToInsert];

      // Rate limiting: wait 1 second between league requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (allMatchesToInsert.length === 0) {
      console.log("No upcoming matches to insert");
      return { success: true, count: 0 };
    }

    console.log(`Upserting ${allMatchesToInsert.length} total matches...`);

    const { data: upsertedMatches, error } = await supabaseAdmin
      .from('matches')
      .upsert(allMatchesToInsert, { onConflict: 'id' })
      .select();

    if (error) {
      console.error("Error upserting matches:", error);
      return { success: false, error: error.message };
    }

    console.log(`Successfully synced ${upsertedMatches?.length || 0} matches`);

    // Mark old matches as finished
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
      message: `Synced ${upsertedMatches?.length || 0} matches across all leagues`
    };

  } catch (error: any) {
    console.error("Error syncing matches:", error);
    return { success: false, error: error.message };
  }
}