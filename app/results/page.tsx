"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchMatchById, formatMatchTime, type Match } from "@/lib/matches";
import { fetchVenuesByMatch } from "@/lib/venues";
import Link from "next/link";

type Venue = {
  id: string;
  name: string;
  neighborhood: string;
  address: string | null;
};

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");
  const [match, setMatch] = useState<Match | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!matchId) return;
      
      const [matchData, venuesData] = await Promise.all([
        fetchMatchById(matchId),
        fetchVenuesByMatch(matchId),
      ]);
      
      setMatch(matchData);
      setVenues(venuesData);
      setLoading(false);
    }
    loadData();
  }, [matchId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Match not found</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to matches
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1d2e] to-[#0f1117]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to matches
        </Link>

        {/* Match Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 mb-8">
          {/* League Badge */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {match.league_emblem && (
                <img 
                  src={match.league_emblem} 
                  alt={match.league}
                  className={`h-8 w-auto object-contain ${
                    match.league === 'Premier League' ? 'brightness-0 invert' : ''
                  }`}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
            </div>
            <div className="bg-purple-600 text-white text-sm font-bold px-4 py-2 rounded-full uppercase">
              {match.league}
            </div>
          </div>

          {/* Teams */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col items-center flex-1">
              {match.home_team_crest && (
                <div className="w-24 h-24 flex items-center justify-center mb-4">
                  <img 
                    src={match.home_team_crest} 
                    alt={match.home_team}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <span className="font-bold text-2xl text-white text-center">{match.home_team}</span>
            </div>
            
            <div className="text-gray-500 font-bold text-3xl px-8">vs</div>
            
            <div className="flex flex-col items-center flex-1">
              {match.away_team_crest && (
                <div className="w-24 h-24 flex items-center justify-center mb-4">
                  <img 
                    src={match.away_team_crest} 
                    alt={match.away_team}
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
              <span className="font-bold text-2xl text-white text-center">{match.away_team}</span>
            </div>
          </div>

          {/* Match Time */}
          <div className="border-t border-white/10 pt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-lg font-semibold">{formatMatchTime(match.kickoff_time)}</span>
            </div>
          </div>
        </div>

        {/* Bars Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white uppercase tracking-wide">
              Sports Bars
            </h2>
            <span className="text-sm text-gray-400">
              {venues.length} {venues.length === 1 ? 'bar' : 'bars'}
            </span>
          </div>

          {venues.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-12 text-center border border-white/10">
              <p className="text-gray-400 text-lg mb-4">
                No bars confirmed for this match yet
              </p>
              <p className="text-gray-500 text-sm">
                Check back soon or search for your favorite team
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {venues.map((venue) => (
                <Link
                  key={venue.id}
                  href={`/venue/${venue.id}?match=${matchId}`}
                  className="block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-white mb-1 group-hover:text-blue-400 transition-colors">
                        {venue.name}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {venue.neighborhood}
                        </span>
                        {venue.address && (
                          <>
                            <span>•</span>
                            <span className="truncate">{venue.address}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <svg 
                      className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors flex-shrink-0 ml-4" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
