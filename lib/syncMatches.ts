import { createClient } from '@supabase/supabase-js';

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// All competitions we want to show - API-Football league IDs
const LEAGUE_IDS = [
  // UEFA Club Competitions
  2,    // Champions League
  3,    // Europa League
  848,  // Conference League
  531,  // UEFA Super Cup

  // Top 5 European Leagues
  39,   // Premier League
  140,  // La Liga
  78,   // Bundesliga
  135,  // Serie A
  61,   // Ligue 1

  // English Cups
  45,   // FA Cup
  48,   // Carabao Cup (EFL Cup)
  528,  // Community Shield

  // Spanish Cups
  143,  // Copa del Rey
  556,  // Supercopa de España

  // Italian Cups
  137,  // Coppa Italia
  547,  // Supercoppa Italiana

  // German Cups
  529,  // DFB Pokal
  530,  // DFL Supercup

  // French Cups
  66,   // Coupe de France
  526,  // Trophée des Champions

  // Other European Leagues
  88,   // Eredivisie (Netherlands)
  94,   // Primeira Liga (Portugal)
  197,  // Super League (Greece)
  144,  // Jupiler Pro League (Belgium)
  203,  // Süper Lig (Turkey)

  // South American
  13,   // Copa Libertadores
  11,   // Copa Sudamericana
  71,   // Brasileirao Serie A
  128,  // Liga Profesional (Argentina)

  // North America
  253,  // MLS (USA)
  262,  // Liga MX (Mexico)

  // Middle East
  307,  // Saudi Pro League

  // International / National Teams
  1,    // World Cup
  4,    // Euro Championship
  5,    // UEFA Nations League
  6,    // Africa Cup of Nations
  9,    // Copa America
  10,   // FIFA Friendlies
  15,   // FIFA Club World Cup
  34,   // World Cup Qualification (UEFA)
];

type APIFootballFixture = {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
  };
  league: {
    id: number;
    name: string;
    logo: string;
  };
  teams: {
    home: { name: string; logo: string };
    away: { name: string; logo: string };
  };
};

export async function syncMatchesFromAPI() {
  if (!API_FOOTBALL_KEY) {
    console.error("API_FOOTBALL_KEY not set");
    return { success: false, error: "API key missing" };
  }

  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = thirtyDaysFromNow.toISOString().split('T')[0];
    const season = today.getFullYear();

    console.log(`Fetching matches from ${dateFrom} to ${dateTo}...`);

    let allMatchesToInsert: any[] = [];

    // Fetch matches for each league
    for (const leagueId of LEAGUE_IDS) {
      console.log(`Fetching league ${leagueId}...`);

      const response = await fetch(
        `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&from=${dateFrom}&to=${dateTo}`,
        {
          headers: {
            'x-apisports-key': API_FOOTBALL_KEY,
          },
        }
      );

      if (!response.ok) {
        console.error(`API error for league ${leagueId}: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const fixtures: APIFootballFixture[] = data.response || [];

      console.log(`Found ${fixtures.length} matches for league ${leagueId}`);

      const matchesToInsert = fixtures
        .filter(f => ['NS', 'TBD'].includes(f.fixture.status.short))
        .map(f => ({
          id: `apif-${f.fixture.id}`,
          league: f.league.name,
          league_emblem: f.league.logo,
          home_team: f.teams.home.name,
          away_team: f.teams.away.name,
          home_team_crest: f.teams.home.logo,
          away_team_crest: f.teams.away.logo,
          kickoff_time: f.fixture.date,
          status: 'upcoming',
        }));

      allMatchesToInsert = [...allMatchesToInsert, ...matchesToInsert];

      // Rate limiting: wait 1 second between requests
      await new Promise(resolve => setTimeout(resolve, 300));
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