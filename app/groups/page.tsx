"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchAllGroups, type Group } from "@/lib/groups";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const data = await fetchAllGroups();
      setGroups(data);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = groups.filter(g => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return g.name.toLowerCase().includes(query) || g.team_name.toLowerCase().includes(query);
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#10141C] to-[#0A0D12] font-sans">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-black text-white">Supporter Groups</h1>
          <Link
            href="/groups/new"
            className="bg-brand-green text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-brand-green-600 transition-all flex-shrink-0"
          >
            + Start a group
          </Link>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Find the supporter group for your club or country in NYC, or start your own.
        </p>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by group or team name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl px-5 py-4 text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-green focus:border-transparent"
          />
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-16 text-center border border-white/10">
            <p className="text-gray-400 text-lg mb-4">
              {search ? "No groups found" : "No supporter groups yet — be the first to start one."}
            </p>
            <Link
              href="/groups/new"
              className="text-brand-green-400 hover:text-brand-green-100 text-sm font-semibold"
            >
              Start a group →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(group => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="block bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 hover:bg-white/10 hover:border-white/20 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{group.name}</p>
                    <p className="text-sm text-brand-green-400">{group.team_name}</p>
                    {group.description && (
                      <p className="text-xs text-gray-400 mt-1 truncate">{group.description}</p>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm flex-shrink-0">View →</span>
                </div>
              </Link>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}