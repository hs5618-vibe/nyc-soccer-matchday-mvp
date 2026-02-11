"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { fetchUpcomingMatches, formatMatchTime, type Match } from "@/lib/matches";

export default function HomePage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadMatches() {
      const data = await fetchUpcomingMatches();
      setMatches(data);
      setLoading(false);
    }
    loadMatches();
  }, []);

  // Filter matches based on search query
  const filteredMatches = useMemo(() => {
    if (!searchQuery.trim()) return matches;
    
    const query = searchQuery.toLowerCase();
    return matches.filter(match => 
      match.home_team.toLowerCase().includes(query) ||
      match.away_team.toLowerCase().includes(query)
    );
  }, [matches, searchQuery]);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pitch-pattern min-h-screen">
      <div className="text-center mb-12">
        <div className="inline-block mb-4">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-4xl shadow-lg">
            ⚽
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Find Your Match
        </h1>
        <p className="text-lg text-gray-600">
          Discover bars showing upcoming games in NYC
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for a team (e.g., Liverpool, Arsenal)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
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
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-500">
            {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'} found
          </p>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading matches...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
          <p className="text-gray-600">
            {searchQuery 
              ? `No matches found for "${searchQuery}"`
              : "No upcoming matches at the moment"
            }
          </p>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="mt-4 text-green-600 hover:text-green-700 text-sm font-medium"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMatches.map((match) => (
            <Link
              key={match.id}
              href={`/results?match=${match.id}`}
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-green-300 hover:shadow-md transition-all group card-hover"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
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
                  className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors flex-shrink-0"
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