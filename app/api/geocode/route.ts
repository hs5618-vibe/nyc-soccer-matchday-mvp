import { NextResponse } from "next/server";

type GeoResult = { lat: number; lon: number; display_name?: string };

const cache = new Map<string, { ts: number; value: GeoResult | null }>();
const lastRequestByIp = new Map<string, number>();

function getClientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return "unknown";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json({ error: "Missing q" }, { status: 400 });
  }

  const ip = getClientIp(req);

  // Soft rate limit: ~1 req/sec per IP (best-effort)
  const now = Date.now();
  const last = lastRequestByIp.get(ip) || 0;
  if (now - last < 900) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a second." },
      { status: 429 }
    );
  }
  lastRequestByIp.set(ip, now);

  // Cache for 7 days
  const key = q.toLowerCase();
  const cached = cache.get(key);
  if (cached && now - cached.ts < 7 * 24 * 60 * 60 * 1000) {
    return NextResponse.json({ result: cached.value, cached: true });
  }

  // Nominatim requirements: provide a real UA/Referer; keep usage light. :contentReference[oaicite:2]{index=2}
  const endpoint = new URL("https://nominatim.openstreetmap.org/search");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("limit", "1");
  endpoint.searchParams.set("q", q);

  const res = await fetch(endpoint.toString(), {
    headers: {
      // Put something real here (app name + contact)
      "User-Agent": "nyc-soccer-matchday/1.0 (contact: you@example.com)",
      "Accept-Language": "en",
    },
    // Slightly cache-friendly
    cache: "no-store",
  });

  if (!res.ok) {
    cache.set(key, { ts: now, value: null });
    return NextResponse.json({ result: null }, { status: 200 });
  }

  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
  const first = data?.[0];

  const result = first
    ? { lat: Number(first.lat), lon: Number(first.lon), display_name: first.display_name }
    : null;

  cache.set(key, { ts: now, value: result });

  return NextResponse.json({ result, cached: false });
}