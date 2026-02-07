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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-12">
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
            className="w-full border border-gray-300 rounded-lg px-4 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading matches...</p>
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <p className="text-gray-600">
            {searchQuery 
              ? `No matches found for "${searchQuery}"`
              : "No upcoming matches at the moment"
            }
          </p>
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery("")}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
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
              className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-gray-900 text-lg">
                    {match.home_team} vs {match.away_team}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {formatMatchTime(match.kickoff_time)}
                  </div>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
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