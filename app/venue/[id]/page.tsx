"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

type Venue = {
  id: string;
  name: string;
  neighborhood: string;
  barType: "Club-Specific" | "General Sports Bar";
  clubName?: string;
  peopleGoing: number;
  status: "Showing" | "Not showing";
};

const venues: Venue[] = [
  {
    id: "red-lion",
    name: "The Red Lion",
    neighborhood: "East Village",
    barType: "Club-Specific",
    clubName: "Liverpool",
    peopleGoing: 14,
    status: "Showing",
  },
  {
    id: "legends",
    name: "Legends",
    neighborhood: "Midtown",
    barType: "General Sports Bar",
    peopleGoing: 8,
    status: "Showing",
  },
  {
    id: "football-factory",
    name: "Football Factory",
    neighborhood: "Lower East Side",
    barType: "General Sports Bar",
    peopleGoing: 5,
    status: "Not showing",
  },
];

export default function VenuePage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const venue = venues.find((v) => v.id === id);

  if (!venue) {
    return (
      <main className="p-6 font-sans max-w-2xl">
        <h1 className="text-2xl font-bold">Venue not found</h1>
        <p className="mt-4 text-gray-600">Sorry, we couldn’t find that venue.</p>
        <Link href="/results" className="mt-4 inline-block text-blue-600 underline">
          ← Back to results
        </Link>
      </main>
    );
  }

  const barTypeDisplay =
    venue.barType === "Club-Specific" && venue.clubName
      ? `Club-Specific: ${venue.clubName}`
      : venue.barType;

  const handleGoing = () => {
    console.log(`User clicked "I'm going" for ${venue.name}`);
    alert("Thanks for letting us know you're going!");
  };

  return (
    <main className="p-6 font-sans max-w-2xl">
      <Link href="/results" className="text-blue-600 text-sm underline">
        ← Back to results
      </Link>

      <h1 className="text-3xl font-bold mt-4">{venue.name}</h1>
      <p className="text-gray-600 mt-1">{venue.neighborhood}</p>
      <p className="text-sm text-gray-500 mt-2">{barTypeDisplay}</p>

      <div className="mt-8 border-t pt-6">
        <h2 className="font-semibold text-lg">Today’s Match</h2>
        <p className="mt-2">Manchester United vs Liverpool — Sat 3:00 PM</p>
      </div>

      <div className="mt-6">
        <p className="font-medium">Status: {venue.status}</p>
        <p className="font-medium mt-2">{venue.peopleGoing} people going</p>
      </div>

      <button
        onClick={handleGoing}
        className="mt-6 bg-blue-600 text-white px-6 py-3 rounded font-medium hover:bg-blue-700"
      >
        I&apos;m going
      </button>
    </main>
  );
}
