"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { fetchUpcomingMatches, formatMatchTime, type Match } from "@/lib/matches";

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLeague, setSelectedLeague] = useState<string>("all");

  useEffect(() => {
    async function loadMatches() {
      const data = await fetchUpcomingMatches();
      setMatches(data);
      setLoading(false);
    }
    loadMatches();
  }, []);

  // Get unique leagues
  const leagues = useMemo(() => {
    const uniqueLeagues = Array.from(new Set(matches.map(m => m.league)));
    return ['all', ...uniqueLeagues.sort()];
  }, [matches]);

  // Filter matches based on search query and league
  const filteredMatches = useMemo(() => {
    let filtered = matches;

    // Filter by league
    if (selectedLeague !== 'all') {
      filtered = filtered.filter(match => match.league === selectedLeague);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(match => 
        match.home_team.toLowerCase().includes(query) ||
        match.away_team.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [matches, searchQuery, selectedLeague]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pitch-pattern min-h-screen">
      <div className="text-center mb-12">
        <div className="inline-block mb-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-black to-gray-800 rounded-full flex items-center justify-center text-4xl shadow-lg">
            ⚽
          </div>
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-3">
          Find Your Sports Bar
        </h1>
        <p className="text-lg text-gray-600">
          Discover where to watch your team's match in NYC
        </p>
      </div>

      {/* League Filter */}
      <div className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {leagues.map((league) => (
            <button
              key={league}
              onClick={() => setSelectedLeague(league)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                selectedLeague === league
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-black'
              }`}
            >
              {league === 'all' ? 'All Leagues' : league}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for a team (e.g., Liverpool, Arsenal)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
          />
          <svg 
            className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {(searchQuery || selectedLeague !== 'all') && (
          <p className="mt-2 text-sm text-gray-500">
            {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'} found
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">Loading matches...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-600">
            {searchQuery || selectedLeague !== 'all'
              ? `No matches found`
              : "No upcoming matches at the moment"
            }
          </p>
          {(searchQuery || selectedLeague !== 'all') && (
            <button 
              onClick={() => {
                setSearchQuery("");
                setSelectedLeague("all");
              }}
              className="mt-4 text-black hover:text-gray-700 text-sm font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((match) => (
            <Link
              key={match.id}
              href={`/results?match=${match.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-black hover:shadow-md transition-all group card-hover"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  {/* League badge */}
                  <div className="mb-2">
                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {match.league}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      {match.home_team_crest && (
                        <img 
                          src={match.home_team_crest} 
                          alt={match.home_team}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                      <span className="font-semibold text-gray-900 text-base">
                        {match.home_team}
                      </span>
                    </div>
                    
                    <span className="text-gray-400 text-sm font-medium">vs</span>
                    
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-base">
                        {match.away_team}
                      </span>
                      {match.away_team_crest && (
                        <img 
                          src={match.away_team_crest} 
                          alt={match.away_team}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatMatchTime(match.kickoff_time)}
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400 group-hover:text-black transition-colors flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}