#!/usr/bin/env node
/**
 * Backfill venue latitude/longitude using OpenStreetMap Nominatim
 * FIXED: Now correctly maps neighborhoods to boroughs (Brooklyn, Queens, etc.)
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = { dryRun: false, limit: 0 };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--limit") {
      const n = Number(argv[i + 1]);
      if (!Number.isFinite(n) || n <= 0) throw new Error(`Invalid --limit value: "${argv[i + 1]}"`);
      args.limit = Math.floor(n);
      i++;
    } else {
      throw new Error(`Unknown arg: ${a}`);
    }
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function maskKey(k) {
  if (!k) return "";
  if (k.length <= 10) return "***";
  return `${k.slice(0, 4)}…${k.slice(-4)}`;
}

function norm(s) {
  return String(s || "").replace(/\s+/g, " ").trim();
}

function buildGeocodeCandidates(v) {
  const name = norm(v.name);
  const address = norm(v.address);
  const neighborhood = norm(v.neighborhood);
  const baseCity = "New York, NY, USA";
  
  // Map neighborhoods to correct boroughs
  const boroughMap = {
    // Brooklyn
    "Park Slope": "Brooklyn",
    "Williamsburg": "Brooklyn",
    "Greenpoint": "Brooklyn",
    "Bushwick": "Brooklyn",
    "Carroll Gardens": "Brooklyn",
    "Cobble Hill": "Brooklyn",
    "Red Hook": "Brooklyn",
    "Prospect Heights": "Brooklyn",
    "Dumbo": "Brooklyn",
    "Downtown Brooklyn": "Brooklyn",
    "Fort Greene": "Brooklyn",
    "Bed-Stuy": "Brooklyn",
    "Crown Heights": "Brooklyn",
    
    // Queens
    "Astoria": "Queens",
    "Long Island City": "Queens",
    "Sunnyside": "Queens",
    "Woodside": "Queens",
    "Jackson Heights": "Queens",
    "Forest Hills": "Queens",
    "Flushing": "Queens",
    
    // Bronx
    "Fordham": "Bronx",
    "Riverdale": "Bronx",
    "Yankee Stadium": "Bronx",
  };
  
  const borough = boroughMap[neighborhood] || "Manhattan";
  const candidates = [];

  // Most specific first
  if (address) {
    candidates.push(`${address}, ${borough}, New York, NY`);
    if (name) candidates.push(`${name}, ${address}, ${borough}, New York, NY`);
  }
  if (name && neighborhood) {
    candidates.push(`${name}, ${neighborhood}, ${borough}, New York, NY`);
  }
  if (name) {
    candidates.push(`${name}, ${borough}, New York, NY`);
  }

  // De-dupe
  const uniq = [];
  for (const c of candidates) if (c && !uniq.includes(c)) uniq.push(c);
  return uniq;
}

function parseLatLonFromNominatim(json) {
  if (!Array.isArray(json) || json.length === 0) return null;
  const top = json[0];
  const lat = Number(top.lat);
  const lon = Number(top.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return { latitude: lat, longitude: lon };
}

async function geocodeNominatim({ q, userAgent }) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "0");

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": userAgent,
      Accept: "application/json",
    },
  });

  if (res.status === 429) return { kind: "rate_limited", status: 429, data: null };
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { kind: "http_error", status: res.status, data: body?.slice(0, 500) || "" };
  }

  const data = await res.json();
  return { kind: "ok", status: 200, data };
}

async function main() {
  const { dryRun, limit } = parseArgs(process.argv);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL) throw new Error("Missing env: SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

  const NOMINATIM_USER_AGENT =
    process.env.NOMINATIM_USER_AGENT ||
    "NYC Soccer Matchday geocoder/1.0 (awaydayz.com)";

  console.log("Backfill venues geo - FIXED VERSION");
  console.log(`- dryRun: ${dryRun}`);
  console.log(`- limit: ${limit || "none"}`);
  console.log(`- supabaseUrl: ${SUPABASE_URL}`);
  console.log(`- serviceRoleKey: ${maskKey(SUPABASE_SERVICE_ROLE_KEY)}`);
  console.log(`- nominatimUA: ${NOMINATIM_USER_AGENT}`);
  console.log("");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  let query = supabase
    .from("venues")
    .select("id,name,neighborhood,address,latitude,longitude");

  if (limit && limit > 0) query = query.limit(limit);

  const { data: venues, error: fetchErr } = await query;
  if (fetchErr) throw new Error(`Supabase fetch error: ${fetchErr.message}`);

  if (!venues || venues.length === 0) {
    console.log("No venues found. Done.");
    return;
  }

  console.log(`Found ${venues.length} venues to re-geocode.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const MIN_INTERVAL_MS = 1100;
  let lastReqAt = 0;

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    const id = v.id;

    const candidates = buildGeocodeCandidates(v);
    if (candidates.length === 0) {
      console.log(`[${i + 1}/${venues.length}] id=${id} SKIP (no candidates)`);
      skipped++;
      continue;
    }

    let geo = null;
    let usedQuery = null;

    for (let attempt = 0; attempt < candidates.length; attempt++) {
      const q = candidates[attempt];

      const now = Date.now();
      const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastReqAt));
      if (wait > 0) await sleep(wait);

      console.log(`[${i + 1}/${venues.length}] id=${id} "${v.name}" try ${attempt + 1}/${candidates.length}: "${q}"`);

      try {
        lastReqAt = Date.now();
        const resp = await geocodeNominatim({ q, userAgent: NOMINATIM_USER_AGENT });

        if (resp.kind === "rate_limited") {
          console.log(`  - 429 rate limited; backing off 5s...`);
          await sleep(5000);
          lastReqAt = Date.now();
          const resp2 = await geocodeNominatim({ q, userAgent: NOMINATIM_USER_AGENT });
          if (resp2.kind === "ok") geo = parseLatLonFromNominatim(resp2.data);
          else geo = null;
        } else if (resp.kind === "http_error") {
          geo = null;
        } else {
          geo = parseLatLonFromNominatim(resp.data);
        }
      } catch (e) {
        geo = null;
      }

      if (geo) {
        usedQuery = q;
        break;
      }
    }

    if (!geo) {
      console.log("  - no result (all attempts)");
      skipped++;
      continue;
    }

    console.log(`  - matched via: "${usedQuery}"`);
    console.log(`  - result: lat=${geo.latitude}, lon=${geo.longitude}`);

    if (dryRun) {
      console.log("  - DRY RUN: not updating");
      updated++;
      continue;
    }

    try {
      const { error: updErr } = await supabase
        .from("venues")
        .update({ latitude: geo.latitude, longitude: geo.longitude })
        .eq("id", id);

      if (updErr) {
        console.log(`  - update error: ${updErr.message}`);
        failed++;
        continue;
      }

      updated++;
    } catch (e) {
      console.log(`  - update exception: ${e?.message || String(e)}`);
      failed++;
      continue;
    }
  }

  console.log("");
  console.log("Done.");
  console.log(`- updated: ${updated}${dryRun ? " (dry-run)" : ""}`);
  console.log(`- skipped: ${skipped}`);
  console.log(`- failed: ${failed}`);
}

main().catch((err) => {
  console.error(`Fatal: ${err?.message || String(err)}`);
  process.exitCode = 1;
});
