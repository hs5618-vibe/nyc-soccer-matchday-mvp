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
    <div className="min-h-screen font-oswald">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-7xl font-black mb-4 text-white" style={{ fontFamily: 'Oswald, sans-serif', letterSpacing: '0.02em' }}>
            awaydayz
          </h1>
          <p className="text-2xl text-gray-300 font-bold mb-2">
            Find Your Sports Bar
          </p>
          <p className="text-lg text-gray-400">
            Discover where to watch your team's match in NYC
          </p>
        </div>

        <div className="mb-8">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {leagues.map((league) => (
              <button
                key={league}
                onClick={() => setSelectedLeague(league)}
                className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${
                  selectedLeague === league
                    ? 'bg-white text-gray-900 shadow-lg transform scale-105'
                    : 'bg-white/10 text-white border border-white/20 hover:bg-white/20'
                }`}
              >
                {league === 'all' ? '⚡ All Leagues' : league}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <div className="relative">
            <input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl px-5 py-4 pl-12 text-base font-medium text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30"
            />
            <svg 
              className="absolute left-4 top-4.5 w-5 h-5 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {(searchQuery || selectedLeague !== 'all') && (
            <p className="mt-3 text-sm font-medium text-gray-300">
              {filteredMatches.length} {filteredMatches.length === 1 ? 'match' : 'matches'} found
            </p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
            <p className="mt-6 text-gray-300 font-medium">Loading matches...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="glass-card-light rounded-3xl p-16 text-center shadow-xl">
            <div className="text-6xl mb-4">⚽</div>
            <p className="text-lg text-gray-900 font-medium mb-4">
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
                className="mt-2 text-gray-900 hover:text-gray-700 text-sm font-bold underline"
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
                  className="block glass-card rounded-2xl p-6 transition-all cursor-pointer shadow-xl card-hover"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4 flex-wrap">
                        {match.league_emblem && (
                          <img 
                            src={match.league_emblem} 
                            alt={match.league}
                            className="h-5 w-auto object-contain brightness-0 invert opacity-80"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                        <span className="text-xs text-gray-500">•</span>
                        <span className="text-sm font-semibold text-gray-400">
                          {formatMatchTime(match.kickoff_time)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-6 flex-wrap">
                        <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                          {match.home_team_crest && (
                            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                              <img 
                                src={match.home_team_crest} 
                                alt={match.home_team}
                                className="w-12 h-12 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <span className="font-bold text-lg text-white truncate">{match.home_team}</span>
                        </div>
                        
                        <span className="text-gray-500 font-medium text-sm">vs</span>
                        
                        <div className="flex items-center gap-3 flex-1 min-w-[200px] justify-end">
                          <span className="font-bold text-lg text-white truncate">{match.away_team}</span>
                          {match.away_team_crest && (
                            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                              <img 
                                src={match.away_team_crest} 
                                alt={match.away_team}
                                className="w-12 h-12 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-6 flex-shrink-0">
                      <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-gray-900 font-bold shadow-lg hover:scale-110 transition-transform">
                        →
                      </div>
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