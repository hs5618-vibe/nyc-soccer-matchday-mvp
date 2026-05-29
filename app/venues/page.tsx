"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { fetchAllVenues, type Venue } from "@/lib/venues";

const TEAM_CRESTS: Record<string, string> = {
  // Premier League
  'Arsenal FC': 'https://crests.football-data.org/57.png',
  'Liverpool FC': 'https://crests.football-data.org/64.png',
  'Manchester City FC': 'https://crests.football-data.org/65.png',
  'Manchester United FC': 'https://crests.football-data.org/66.png',
  'Tottenham Hotspur FC': 'https://crests.football-data.org/73.png',
  'Newcastle United FC': 'https://crests.football-data.org/67.png',
  'Everton FC': 'https://crests.football-data.org/62.png',
  'Brentford FC': 'https://crests.football-data.org/402.png',
  'Chelsea FC': 'https://crests.football-data.org/61.png',
  'Aston Villa FC': 'https://crests.football-data.org/58.png',
  'Brighton & Hove Albion FC': 'https://crests.football-data.org/397.png',
  'West Ham United FC': 'https://crests.football-data.org/563.png',
  'Wolverhampton Wanderers FC': 'https://crests.football-data.org/76.png',
  'Fulham FC': 'https://crests.football-data.org/63.png',
  'Crystal Palace FC': 'https://crests.football-data.org/354.png',
  'Nottingham Forest FC': 'https://crests.football-data.org/351.png',
  'AFC Bournemouth': 'https://crests.football-data.org/1044.png',
  'Leicester City FC': 'https://crests.football-data.org/338.png',
  'Ipswich Town FC': 'https://crests.football-data.org/57.png',
  'Southampton FC': 'https://crests.football-data.org/340.png',
  // European clubs
  'FC Barcelona': 'https://crests.football-data.org/81.png',
  'Real Madrid CF': 'https://crests.football-data.org/86.png',
  'Club Atlético de Madrid': 'https://crests.football-data.org/78.png',
  'FC Bayern München': 'https://crests.football-data.org/5.png',
  'Borussia Dortmund': 'https://crests.football-data.org/4.png',
  'Paris Saint-Germain FC': 'https://crests.football-data.org/524.png',
  'Olympique Lyonnais': 'https://crests.football-data.org/523.png',
  'Olympique de Marseille': 'https://crests.football-data.org/516.png',
  'Inter Milan': 'https://crests.football-data.org/108.png',
  'Juventus FC': 'https://crests.football-data.org/109.png',
  'AC Milan': 'https://crests.football-data.org/98.png',
  'AS Roma': 'https://crests.football-data.org/100.png',
  'SSC Napoli': 'https://crests.football-data.org/113.png',
  'SS Lazio': 'https://crests.football-data.org/110.png',
  'FC Porto': 'https://crests.football-data.org/503.png',
  'SL Benfica': 'https://crests.football-data.org/498.png',
  'Sporting CP': 'https://crests.football-data.org/498.png',
  'AFC Ajax': 'https://crests.football-data.org/678.png',
  'PSV Eindhoven': 'https://crests.football-data.org/674.png',
  'Boca Juniors': 'https://crests.football-data.org/null.png',
  'River Plate': 'https://crests.football-data.org/null.png',
  // World Cup nations
  'Argentina': 'https://crests.football-data.org/762.png',
  'Brazil': 'https://crests.football-data.org/764.svg',
  'Colombia': 'https://crests.football-data.org/818.svg',
  'Mexico': 'https://crests.football-data.org/769.svg',
  'Uruguay': 'https://crests.football-data.org/758.svg',
  'Spain': 'https://crests.football-data.org/760.svg',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'France': '🇫🇷',
  'Germany': '🇩🇪',
  'Portugal': '🇵🇹',
  'Italy': '🇮🇹',
  'Netherlands': '🇳🇱',
  'Belgium': '🇧🇪',
  'Denmark': '🇩🇰',
  'Morocco': '🇲🇦',
  'Senegal': '🇸🇳',
  'Ghana': '🇬🇭',
  'Cameroon': '🇨🇲',
  'Nigeria': '🇳🇬',
  "Cote d'Ivoire": '🇨🇮',
  'Cape Verde': '🇨🇻',
  'Congo DR': '🇨🇩',
  'Curacao': '🇨🇼',
  'Czechia': '🇨🇿',
  'Haiti': '🇭🇹',
  'Jordan': '🇯🇴',
  'Norway': '🇳🇴',
  'Qatar': '🇶🇦',
  'Sweden': '🇸🇪',
  'Uzbekistan': '🇺🇿',
  'Bosnia and Herzegovina': '🇧🇦',
  'South Africa': '🇿🇦',
  'Egypt': '🇪🇬',
  'Tunisia': '🇹🇳',
  'Algeria': '🇩🇿',
  'Mali': '🇲🇱',
  'Tanzania': '🇹🇿',
  'Comoros': '🇰🇲',
  'Benin': '🇧🇯',
  'Botswana': '🇧🇼',
  'Japan': '🇯🇵',
  'South Korea': '🇰🇷',
  'Australia': '🇦🇺',
  'Iran': '🇮🇷',
  'Saudi Arabia': '🇸🇦',
  'United States': '🇺🇸',
  'Canada': '🇨🇦',
  'Ecuador': '🇪🇨',
  'Chile': '🇨🇱',
  'Paraguay': '🇵🇾',
  'Venezuela': '🇻🇪',
  'Bolivia': '🇧🇴',
  'Peru': '🇵🇪',
  'Panama': '🇵🇦',
  'Costa Rica': '🇨🇷',
  'Honduras': '🇭🇳',
  'El Salvador': '🇸🇻',
  'Jamaica': '🇯🇲',
  'Trinidad and Tobago': '🇹🇹',
  'Cuba': '🇨🇺',
  'Guatemala': '🇬🇹',
  'New Zealand': '🇳🇿',
  'Serbia': '🇷🇸',
  'Croatia': '🇭🇷',
  'Poland': '🇵🇱',
  'Switzerland': '🇨🇭',
  'Austria': '🇦🇹',
  'Ukraine': '🇺🇦',
  'Turkey': '🇹🇷',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Slovakia': '🇸🇰',
  'Slovenia': '🇸🇮',
  'Albania': '🇦🇱',
  'Iraq': '🇮🇶',
  'Indonesia': '🇮🇩',
};
export default function VenuesPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string>("all");

  useEffect(() => {
    async function loadVenues() {
      const data = await fetchAllVenues();
      setVenues(data);
      setLoading(false);
    }
    loadVenues();
  }, []);

  const neighborhoods = useMemo(() => {
    const unique = Array.from(new Set(venues.map(v => v.neighborhood))).filter(Boolean);
    return ['all', ...unique.sort()];
  }, [venues]);

  const filteredVenues = useMemo(() => {
    let filtered = venues;

    if (selectedNeighborhood !== 'all') {
      filtered = filtered.filter(venue => venue.neighborhood === selectedNeighborhood);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(venue => 
        venue.name.toLowerCase().includes(query) ||
        venue.neighborhood?.toLowerCase().includes(query) ||
        venue.address?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [venues, searchQuery, selectedNeighborhood]);

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
          Back to home
        </Link>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white mb-2">All Venues</h1>
          <p className="text-gray-400">
            Bar owners: Find your venue to claim it and manage your listings
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Search venues by name, neighborhood, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-4 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Neighborhood Filter */}
        <div className="mb-8">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {neighborhoods.map((neighborhood) => (
              <button
                key={neighborhood}
                onClick={() => setSelectedNeighborhood(neighborhood)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedNeighborhood === neighborhood
                    ? 'bg-white/10 text-white border border-white/20'
                    : 'bg-transparent text-gray-400 border border-white/10 hover:border-white/20'
                }`}
              >
                {neighborhood === 'all' ? 'All Neighborhoods' : neighborhood}
              </button>
            ))}
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white uppercase tracking-wide">
            Venues
          </h2>
          <span className="text-sm text-gray-400">
            {filteredVenues.length} {filteredVenues.length === 1 ? 'venue' : 'venues'}
          </span>
        </div>

        {/* Venues List */}
        {filteredVenues.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-16 text-center border border-white/10">
            <p className="text-gray-400 text-lg mb-4">
              {searchQuery || selectedNeighborhood !== 'all'
                ? `No venues found`
                : "No venues available"
              }
            </p>
            {(searchQuery || selectedNeighborhood !== 'all') && (
              <button 
                onClick={() => {
                  setSearchQuery("");
                  setSelectedNeighborhood("all");
                }}
                className="text-blue-400 hover:text-blue-300 text-sm font-semibold"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVenues.map((venue) => (
              <Link
                key={venue.id}
                href={`/venue/${venue.id}`}
                className="block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors truncate">
                        {venue.name}
                      </h3>
                      {(venue as any).supported_teams?.slice(0, 3).map((team: string) => {
                        const crest = TEAM_CRESTS[team];
                        if (!crest) return null;
                        if (crest.startsWith('http')) {
                          return <img key={team} src={crest} alt={team} title={team} className="w-5 h-5 object-contain flex-shrink-0" onError={(e) => { e.currentTarget.style.display = 'none'; }} />;
                        }
                        return <span key={team} title={team} className="text-base flex-shrink-0">{crest}</span>;
                      })}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span className="truncate">{venue.neighborhood}</span>
                      </span>
                      {venue.address && (
                        <>
                          <span className="hidden sm:inline">•</span>
                          <span className="truncate">{venue.address}</span>
                        </>
                      )}
                    </div>

                    {venue.bar_type && (
                      <div className="mt-2">
                        <span className="inline-block bg-blue-600/20 border border-blue-600/30 text-blue-300 text-xs font-semibold px-2 py-1 rounded">
                          {venue.bar_type === 'general' ? 'General Sports Bar' : `${venue.club_name || ''} Bar`.trim()}
                        </span>
                      </div>
                    )}
                  </div>

                  <svg
                    className="w-6 h-6 text-gray-400 group-hover:text-white transition-colors flex-shrink-0"
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
  );
}
