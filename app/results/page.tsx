"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchShowingsForMatch, type ShowingRow } from "../../lib/showings";
import { fetchGoingCount } from "../../lib/going";

export default function ResultsPage() {
  const searchParams = useSearchParams();
  const matchId = useMemo(() => searchParams.get("match") ?? "man-utd-v-liverpool", [searchParams]);

  const [rows, setRows] = useState<ShowingRow[]>([]);
  const [goingCounts, setGoingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const data = await fetchShowingsForMatch(matchId);
        if (!cancelled) {
          setRows(data);
          
          const countPromises = data.map(async (row) => {
            if (row.venue_id) {
              const count = await fetchGoingCount({ matchId, venueId: row.venue_id });
              return { venueId: row.venue_id, count };
            }
            return null;
          });

          const countResults = await Promise.all(countPromises);
          const counts: Record<string, number> = {};
          countResults.forEach((result) => {
            if (result) {
              counts[result.venueId] = result.count;
            }
          });

          if (!cancelled) setGoingCounts(counts);
        }
      } catch (err: any) {
        if (!cancelled) setErrorMsg(err?.message ?? "Failed to load bars for this match");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  const matchLabel = matchId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const otherMatches = [
    { id: "man-utd-v-liverpool", label: "Man Utd vs Liverpool" },
    { id: "chelsea-v-arsenal", label: "Chelsea vs Arsenal" },
    { id: "spurs-v-man-city", label: "Spurs vs Man City" },
  ].filter((m) => m.id !== matchId);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      
      <div className="mb-8">
        <Link href="/" className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to matches
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Bars Showing This Match
        </h1>
        <p className="text-lg text-gray-600">{matchLabel}</p>

        {otherMatches.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Switch to:</span>
            {otherMatches.map((m) => (
              <Link key={m.id} href={`/results?match=${m.id}`}>
                <button className="bg-transparent text-gray-700 px-3 py-1.5 text-sm font-medium rounded-lg hover:bg-gray-100 transition-all">
                  {m.label}
                </button>
              </Link>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading bars...</p>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5">
          <p className="text-red-800 font-medium">Error: {errorMsg}</p>
        </div>
      )}

      {!loading && !errorMsg && (
        <div className="space-y-4">
          {rows.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <div className="text-gray-400 mb-3">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No bars yet</h3>
              <p className="text-gray-500">Be the first to add a bar for this match</p>
            </div>
          )}

          {rows.map((r) => {
            const v = r.venue;
            if (!v) return null;
            
            const barType =
              v.bar_type === "club" && v.club_name
                ? `Club-Specific: ${v.club_name}`
                : "General Sports Bar";

            const isShowing = r.status === "showing";
            const goingCount = goingCounts[r.venue_id] ?? 0;

            return (
              <Link key={r.venue_id} href={`/venue/${v.id}?match=${matchId}`} className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-md transition-all">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {v.name}
                      </h3>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        isShowing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isShowing ? "Showing" : "Not showing"}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">{v.neighborhood}</p>

                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-gray-500">{barType}</span>
                      <span className="text-gray-300">•</span>
                      <span className="font-medium text-gray-700">
                        {goingCount} {goingCount === 1 ? "person" : "people"} going
                      </span>
                    </div>

                    {r.note && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                        <p className="text-sm text-blue-900">{r.note}</p>
                      </div>
                    )}
                  </div>

                  <svg
                    className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1"
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
            );
          })}
        </div>
      )}
    </div>
  );
}