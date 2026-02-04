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

  const matchLabel = matchId.replaceAll("-", " ");

  return (
    <main className="p-6 font-sans max-w-2xl">
      <Link href="/" className="text-blue-600 text-sm underline">
        ← Back
      </Link>

      <h1 className="text-2xl font-bold mt-4">Bars for this match</h1>
      <p className="mt-2 text-gray-600">
        Match: <span className="font-medium">{matchLabel}</span>
      </p>

      <div className="mt-4 flex gap-2 text-sm">
        <Link className="underline text-blue-600" href="/results?match=man-utd-v-liverpool">
          Man Utd vs Liverpool
        </Link>
        <span>·</span>
        <Link className="underline text-blue-600" href="/results?match=chelsea-v-arsenal">
          Chelsea vs Arsenal
        </Link>
        <span>·</span>
        <Link className="underline text-blue-600" href="/results?match=spurs-v-man-city">
          Spurs vs Man City
        </Link>
      </div>

      {loading && <p className="mt-6 text-gray-600">Loading…</p>}
      {errorMsg && <p className="mt-6 text-red-600">Error: {errorMsg}</p>}

      {!loading && !errorMsg && (
        <ul className="mt-6 space-y-4">
          {rows.length === 0 && (
            <li className="text-gray-600">No bars have posted for this match yet.</li>
          )}

          {rows.map((r) => {
            const v = r.venue;
            if (!v) return null;
            
            const barType =
              v.bar_type === "club" && v.club_name
                ? `Club-Specific: ${v.club_name}`
                : "General Sports Bar";

            const statusLabel = r.status === "showing" ? "Showing ✅" : "Not showing ❌";
            const goingCount = goingCounts[r.venue_id] ?? 0;

            return (
              <li key={`${r.venue_id}`} className="border p-4 rounded">
                <Link href={`/venue/${v.id}?match=${matchId}`} className="underline text-blue-600">
                  {v.name} — {v.neighborhood}
                </Link>

                <div className="mt-2 text-sm text-gray-600">{barType}</div>

                <div className="mt-2 text-sm font-medium">{statusLabel}</div>

                <div className="mt-2 text-sm font-medium">{goingCount} going</div>

                {r.note && <div className="mt-2 text-sm text-gray-700">Note: {r.note}</div>}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}