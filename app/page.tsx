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

  const leagues = useMemo(() => {
    const uniqueLeagues = Array.from(new Set(matches.map(m => m.league)));
    return ['all', ...uniqueLeagues.sort()];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    let filtered = matches;

    if (selectedLeague !== 'all') {
      filtered = filtered.filter(match => match.league === selectedLeague);
    }

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
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
              awaydayz
            </h1>
            <p className="text-xl text-blue-300 font-semibold mb-1">
              Find Your Sports Bar
            </p>
            <p className="text-base text-gray-400">
              Discover where to watch your team's match in NYC
            </p>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">NYC</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search for teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-4 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* League Filter Pills */}
        <div className="mb-8">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {leagues.map((league) => (
              <button
                key={league}
                onClick={() => setSelectedLeague(league)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedLeague === league
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-transparent text-gray-400 border border-white/10 hover:border-white/20'
                }`}
              >
                {league === 'all' ? 'All' : league}
              </button>
            ))}
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white uppercase tracking-wide">
            Upcoming Matches
          </h2>
          <span className="text-sm text-gray-400">
            {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'}
          </span>
        </div>

        {/* Matches List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
            <p className="mt-4 text-gray-400">Loading matches...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-16 text-center border border-white/10">
            <p className="text-gray-400 text-lg mb-4">
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
                className="text-blue-400 hover:text-blue-300 text-sm font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredMatches.map((match) => {
              return (
                <Link
                  key={match.id}
                  href={`/results?match=${match.id}`}
                  className="block bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  {/* League Badge */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      {match.league_emblem && (
                        <img 
                          src={match.league_emblem} 
                          alt={match.league}
                          className={`h-6 w-auto object-contain ${
                            match.league === 'Premier League' ? 'brightness-0 invert' : ''
                          }`}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      )}
                    </div>
                    <div className="bg-purple-600 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase">
                      {match.league}
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col items-center flex-1">
                      {match.home_team_crest && (
                        <div className="w-20 h-20 flex items-center justify-center mb-3">
                          <img 
                            src={match.home_team_crest} 
                            alt={match.home_team}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <span className="font-bold text-lg text-white text-center">{match.home_team}</span>
                    </div>
                    
                    <div className="text-gray-500 font-bold text-2xl px-6">vs</div>
                    
                    <div className="flex flex-col items-center flex-1">
                      {match.away_team_crest && (
                        <div className="w-20 h-20 flex items-center justify-center mb-3">
                          <img 
                            src={match.away_team_crest} 
                            alt={match.away_team}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <span className="font-bold text-lg text-white text-center">{match.away_team}</span>
                    </div>
                  </div>

                  {/* Match Info */}
                  <div className="border-t border-white/10 pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-sm font-medium">{formatMatchTime(match.kickoff_time)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-blue-400 font-semibold">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm">View bars →</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}