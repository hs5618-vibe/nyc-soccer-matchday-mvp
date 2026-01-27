import Link from "next/link";

export default function HomePage() {
  return (
    <main className="p-6 font-sans max-w-2xl">
      <h1 className="text-3xl font-bold">NYC Soccer Matchday</h1>
      <p className="mt-2 text-gray-600">
        Find bars showing your match today
      </p>

      <div className="mt-8 space-y-4">
        <Link
          href="/results?match=man-utd-v-liverpool"
          className="block border rounded p-4 hover:bg-gray-50"
        >
          <div className="font-semibold">
            Manchester United vs Liverpool
          </div>
          <div className="text-sm text-gray-600">Sat 3:00 PM</div>
        </Link>

        <Link
          href="/results?match=chelsea-v-arsenal"
          className="block border rounded p-4 hover:bg-gray-50"
        >
          <div className="font-semibold">
            Chelsea vs Arsenal
          </div>
          <div className="text-sm text-gray-600">Sat 5:30 PM</div>
        </Link>

        <Link
          href="/results?match=spurs-v-man-city"
          className="block border rounded p-4 hover:bg-gray-50"
        >
          <div className="font-semibold">
            Tottenham vs Manchester City
          </div>
          <div className="text-sm text-gray-600">Sun 12:00 PM</div>
        </Link>
      </div>

      <div className="mt-10 text-sm text-gray-500">
        MVP: NYC only • Live bar updates
      </div>

    </main>
  );
}
