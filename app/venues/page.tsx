"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { fetchAllVenues, type Venue } from "@/lib/venues";

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
                    <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors mb-2 truncate">
                      {venue.name}
                    </h3>

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
