import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Very small in-memory throttle to be nice to upstream services.
 * Note: this resets on server restart / new lambda instance.
 */
let lastRequestAt = 0;

function sanitizeQuery(q: string) {
  return q.trim().replace(/\s+/g, " ").slice(0, 200);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("query") || "";
    const query = sanitizeQuery(raw);

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    // Simple throttle: 1 request / second (approx) to respect common Nominatim guidance.
    const now = Date.now();
    const delta = now - lastRequestAt;
    if (delta < 1000) {
      await new Promise((r) => setTimeout(r, 1000 - delta));
    }
    lastRequestAt = Date.now();

    const url =
      "https://nominatim.openstreetmap.org/search?" +
      new URLSearchParams({
        q: query,
        format: "json",
        addressdetails: "1",
        limit: "1",
      }).toString();

    // IMPORTANT: identify your app. Put something real in env.
    // Nominatim policy expects a valid User-Agent with contact info. :contentReference[oaicite:2]{index=2}
    const userAgent =
      process.env.NOMINATIM_USER_AGENT ||
      "NYCMatchday/0.1 (contact: you@example.com)";

    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept-Language": "en",
      },
      // No caching while iterating; you can add caching later
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Geocode upstream error", status: res.status, detail: text.slice(0, 300) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as any[];

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ found: false, query });
    }

    const top = data[0];
    const lat = Number(top.lat);
    const lng = Number(top.lon);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return NextResponse.json({ found: false, query });
    }

    return NextResponse.json({
      found: true,
      query,
      lat,
      lng,
      display_name: top.display_name || null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: "Unexpected error", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}