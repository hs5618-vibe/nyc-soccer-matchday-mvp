"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchGroupById,
  fetchMemberCount,
  isGroupMember,
  joinGroup,
  leaveGroup,
  fetchGroupVenues,
  linkVenueToGroup,
  unlinkVenueFromGroup,
  type Group,
} from "@/lib/groups";
import { fetchAllVenues, type Venue } from "@/lib/venues";

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<Group | null>(null);
  const [memberCount, setMemberCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [isMember, setIsMember] = useState(false);
  const [linkedVenues, setLinkedVenues] = useState<{ id: string; name: string; neighborhood: string }[]>([]);

  // Owner-only venue linking
  const [allVenues, setAllVenues] = useState<Venue[]>([]);
  const [venueSearch, setVenueSearch] = useState("");
  const [showVenuePicker, setShowVenuePicker] = useState(false);

  useEffect(() => {
    async function load() {
      const [groupData, { data: { user: currentUser } }] = await Promise.all([
        fetchGroupById(groupId),
        supabase.auth.getUser(),
      ]);

      setGroup(groupData);
      setUser(currentUser);

      if (groupData) {
        const [count, venues] = await Promise.all([
          fetchMemberCount(groupId),
          fetchGroupVenues(groupId),
        ]);
        setMemberCount(count);
        setLinkedVenues(venues);

        if (currentUser) {
          const member = await isGroupMember(groupId, currentUser.id);
          setIsMember(member);
        }
      }

      setLoading(false);
    }
    load();
  }, [groupId]);

  async function toggleMembership() {
    if (!user) {
      alert("Please sign in to join a group");
      return;
    }

    if (isMember) {
      setIsMember(false);
      setMemberCount(prev => Math.max(0, prev - 1));
      await leaveGroup(groupId, user.id);
    } else {
      setIsMember(true);
      setMemberCount(prev => prev + 1);
      await joinGroup(groupId, user.id);
    }
  }

  async function openVenuePicker() {
    if (allVenues.length === 0) {
      const venues = await fetchAllVenues();
      setAllVenues(venues);
    }
    setShowVenuePicker(true);
  }

  async function handleLinkVenue(venueId: string, venueName: string, neighborhood: string) {
    const ok = await linkVenueToGroup(groupId, venueId);
    if (ok) {
      setLinkedVenues(prev => [...prev, { id: venueId, name: venueName, neighborhood }]);
    }
  }

  async function handleUnlinkVenue(venueId: string) {
    setLinkedVenues(prev => prev.filter(v => v.id !== venueId));
    await unlinkVenueFromGroup(groupId, venueId);
  }

  const isOwner = user && group && user.id === group.created_by;
  const filteredVenues = allVenues.filter(v => {
    const query = venueSearch.trim().toLowerCase();
    if (!query) return true;
    return v.name.toLowerCase().includes(query);
  });
  const linkedVenueIds = new Set(linkedVenues.map(v => v.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#10141C] to-[#0A0D12] flex items-center justify-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#10141C] to-[#0A0D12] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Group not found.</p>
          <Link href="/groups" className="text-brand-green-400 hover:text-brand-green-100 text-sm font-semibold">
            ← Back to groups
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#10141C] to-[#0A0D12] font-sans">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        <Link href="/groups" className="text-sm text-brand-green-400 hover:text-brand-green-100 font-medium inline-flex items-center gap-1 mb-6">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to groups
        </Link>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h1 className="text-3xl font-black text-white">{group.name}</h1>
              <p className="text-brand-green-400 font-semibold">{group.team_name}</p>
            </div>
            <button
              onClick={toggleMembership}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                isMember
                  ? "bg-brand-green text-white"
                  : "bg-white/10 text-gray-300 hover:bg-white/20"
              }`}
            >
              {isMember ? "✓ Member" : "Join"}
            </button>
          </div>

          <p className="text-gray-400 text-sm mb-3">
            {memberCount} {memberCount === 1 ? "member" : "members"}
          </p>

          {group.description && (
            <p className="text-gray-300 text-sm mb-3">{group.description}</p>
          )}

          {group.instagram && (
            
              href={`https://instagram.com/${group.instagram.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-green-400 hover:text-brand-green-100 text-sm font-semibold"
            >
              {group.instagram} on Instagram →
            </a>
          )}
        </div>

        {/* Linked Venues */}
        <div className="mb-6">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Where we watch</h2>

          {linkedVenues.length === 0 ? (
            <p className="text-gray-500 text-sm mb-3">No venue linked yet.</p>
          ) : (
            <div className="space-y-2 mb-3">
              {linkedVenues.map(venue => (
                <div
                  key={venue.id}
                  className="flex items-center justify-between gap-3 bg-white/5 border border-white/10 rounded-xl p-3"
                >
                  <Link href={`/venue/${venue.id}`} className="min-w-0">
                    <p className="text-sm font-semibold text-white hover:text-brand-green-400 transition-colors truncate">{venue.name}</p>
                    <p className="text-xs text-gray-400 truncate">{venue.neighborhood}</p>
                  </Link>
                  {isOwner && (
                    <button
                      onClick={() => handleUnlinkVenue(venue.id)}
                      className="text-gray-500 hover:text-red-400 text-xs font-semibold flex-shrink-0"
                    >
                      Unlink
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Owner-only: link a new venue */}
          {isOwner && (
            <div>
              {!showVenuePicker ? (
                <button
                  onClick={openVenuePicker}
                  className="text-brand-green-400 hover:text-brand-green-100 text-sm font-semibold"
                >
                  + Link a venue
                </button>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <input
                    type="text"
                    placeholder="Search venues by name..."
                    value={venueSearch}
                    onChange={(e) => setVenueSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green mb-3"
                  />
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {filteredVenues
                      .filter(v => !linkedVenueIds.has(v.id))
                      .slice(0, 30)
                      .map(venue => (
                        <button
                          key={venue.id}
                          onClick={() => handleLinkVenue(venue.id, venue.name, venue.neighborhood)}
                          className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white transition-all"
                        >
                          {venue.name} <span className="text-gray-500 text-xs">· {venue.neighborhood}</span>
                        </button>
                      ))}
                  </div>
                  <button
                    onClick={() => setShowVenuePicker(false)}
                    className="text-gray-500 hover:text-gray-300 text-xs font-semibold mt-3"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}