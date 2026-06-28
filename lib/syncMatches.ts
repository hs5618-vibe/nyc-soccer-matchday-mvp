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
  WORLD_CUP: 2000,
  EUROS: 2018,
  EREDIVISIE: 2003,
  PRIMEIRA_LIGA: 2017,
  BRASILEIRAO: 2013,
  CHAMPIONSHIP: 2016,
};

const LEAGUE_NAMES: Record<number, string> = {
  2021: 'Premier League',
  2014: 'La Liga',
  2002: 'Bundesliga',
  2019: 'Serie A',
  2015: 'Ligue 1',
  2001: 'Champions League',
  2000: 'World Cup',
  2018: 'European Championship',
  2003: 'Eredivisie',
  2017: 'Primeira Liga',
  2013: 'Brasileirao',
  2016: 'Championship',
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

type FootballDataResponse = {
  matches: FootballDataMatch[];
  competition: {
    id: number;
    name: string;
    emblem: string;
  };
};

export async function syncMatchesFromAPI() {
  if (!FOOTBALL_DATA_API_KEY) {
    console.error("FOOTBALL_DATA_API_KEY not set");
    return { success: false, error: "API key missing" };
  }

  try {
    const today = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(today.getDate() + 90);

    const dateFrom = today.toISOString().split('T')[0];
    const dateTo = ninetyDaysFromNow.toISOString().split('T')[0];

    console.log(`Fetching matches from ${dateFrom} to ${dateTo}...`);

    let allMatchesToInsert: any[] = [];

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
        await new Promise(resolve => setTimeout(resolve, 6000));
        continue;
      }

      const data: FootballDataResponse = await response.json();
      await new Promise(resolve => setTimeout(resolve, 6000));
      const matches: FootballDataMatch[] = data.matches || [];
      const leagueEmblem = data.competition?.emblem || '';

      console.log(`Found ${matches.length} matches for ${LEAGUE_NAMES[leagueId]}`);

      const matchesToInsert = matches
         .filter(m => m.status !== 'FINISHED' && m.status !== 'CANCELLED' && m.status !== 'POSTPONED' && m.homeTeam?.name && m.awayTeam?.name)
          .map(match => ({
          id: `${leagueKey.toLowerCase()}-${match.id}`,
          league: LEAGUE_NAMES[leagueId],
          league_emblem: leagueEmblem,
          home_team: match.homeTeam.name,
          away_team: match.awayTeam.name,
          home_team_crest: match.homeTeam.crest,
          away_team_crest: match.awayTeam.crest,
          kickoff_time: match.utcDate,
          status: 'upcoming',
        }));

      allMatchesToInsert = [...allMatchesToInsert, ...matchesToInsert];
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

    const { error: updateError } = await supabaseAdmin
      .from('matches')
      .update({ status: 'finished' })
      .lt('kickoff_time', today.toISOString())
      .eq('status', 'upcoming');

    if (updateError) {
      console.warn("Error updating old matches:", updateError);
    }

    // Auto-generate venue_matches from venue_defaults and supported_teams
    console.log("Auto-generating venue_matches from defaults...");

    const newMatchIds = upsertedMatches?.map(m => m.id) || [];

    if (newMatchIds.length > 0) {
      const { data: defaults } = await supabaseAdmin
        .from('venue_defaults')
        .select('venue_id, league, team');

      const { data: venues } = await supabaseAdmin
        .from('venues')
        .select('id, supported_teams');

      const { data: newMatches } = await supabaseAdmin
        .from('matches')
        .select('id, league, home_team, away_team')
        .in('id', newMatchIds);

      const venueMatchesToInsert: any[] = [];

      for (const match of newMatches || []) {
        const matchingVenueIds = new Set<string>();

        for (const def of defaults || []) {
          if (def.league === match.league) {
            matchingVenueIds.add(def.venue_id);
          }
        }

        for (const venue of venues || []) {
          const teams: string[] = venue.supported_teams || [];
          if (
            teams.some(t =>
              match.home_team.includes(t) || match.away_team.includes(t)
            )
          ) {
            matchingVenueIds.add(venue.id);
          }
        }

        for (const venueId of matchingVenueIds) {
          venueMatchesToInsert.push({
            venue_id: venueId,
            match_id: match.id,
            verified_by_owner: false,
            sound_on: false,
          });
        }
      }

      if (venueMatchesToInsert.length > 0) {
        const { error: vmError } = await supabaseAdmin
          .from('venue_matches')
          .upsert(venueMatchesToInsert, { onConflict: 'venue_id,match_id' });

        if (vmError) {
          console.warn("Error inserting venue_matches:", vmError);
        } else {
          console.log(`Auto-generated ${venueMatchesToInsert.length} venue_matches rows`);
        }
      }
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