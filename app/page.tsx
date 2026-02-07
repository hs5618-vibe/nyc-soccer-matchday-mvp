import Link from "next/link";

export default function HomePage() {
  const matches = [
    {
      id: "man-utd-v-liverpool",
      homeTeam: "Manchester United",
      awayTeam: "Liverpool",
      time: "Sat 3:00 PM",
    },
    {
      id: "chelsea-v-arsenal",
      homeTeam: "Chelsea",
      awayTeam: "Arsenal",
      time: "Sat 5:30 PM",
    },
    {
      id: "spurs-v-man-city",
      homeTeam: "Tottenham",
      awayTeam: "Manchester City",
      time: "Sun 12:00 PM",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Find Your Match
        </h1>
        <p className="text-lg text-gray-600">
          Discover bars showing today's games in NYC
        </p>
      </div>

      <div className="space-y-3">
        {matches.map((match) => (
          <Link key={match.id} href={`/results?match=${match.id}`} className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-md transition-all">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-semibold text-gray-900 text-lg">
                  {match.homeTeam} vs {match.awayTeam}
                </div>
                <div className="text-sm text-gray-500 mt-1">{match.time}</div>
              </div>
              <svg
                className="w-5 h-5 text-gray-400"
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
        ))}
      </div>
    </div>
  );
}