#!/usr/bin/env node
/**
 * Backfill venue latitude/longitude using OpenStreetMap Nominatim
 *
 * Safe defaults:
 * - Uses process.env only
 * - Rate limited (<= 1 req/sec)
 * - --dry-run and --limit flags
 * - Does not log secrets
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// -------------------------
// CLI parsing
// -------------------------
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

function buildAddressForQuery(v) {
  // Based on your schema: id, name, neighborhood, address, latitude, longitude
  // Compose: "Name, Address, Neighborhood, New York, NY, USA"
  const parts = [];

  if (v.name) parts.push(String(v.name).trim());
  if (v.address) parts.push(String(v.address).trim());
  if (v.neighborhood) parts.push(String(v.neighborhood).trim());

  // Always anchor to NYC to improve accuracy
  parts.push("New York");
  parts.push("NY");
  parts.push("USA");

  const cleaned = parts
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  // De-dupe while preserving order
  const uniq = [];
  for (const p of cleaned) if (!uniq.includes(p)) uniq.push(p);

  return uniq.join(", ");
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

// -------------------------
// Main
// -------------------------
async function main() {
  const { dryRun, limit } = parseArgs(process.argv);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL) throw new Error("Missing env: SUPABASE_URL");
  if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing env: SUPABASE_SERVICE_ROLE_KEY");

  // Make sure your .env uses this exact key name:
  // NOMINATIM_USER_AGENT="NYC Soccer Matchday geocoder (yourdomain.com) contact: you@domain.com"
  const NOMINATIM_USER_AGENT =
    process.env.NOMINATIM_USER_AGENT ||
    "NYC Soccer Matchday geocoder (set NOMINATIM_USER_AGENT)";

  console.log("Backfill venues geo");
  console.log(`- dryRun: ${dryRun}`);
  console.log(`- limit: ${limit || "none"}`);
  console.log(`- supabaseUrl: ${SUPABASE_URL}`);
  console.log(`- serviceRoleKey: ${maskKey(SUPABASE_SERVICE_ROLE_KEY)}`);
  console.log(`- nominatimUA: ${NOMINATIM_USER_AGENT}`);
  console.log("");

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Select ONLY columns that exist in your venues table (per your screenshot).
  let query = supabase
    .from("venues")
    .select("id,name,neighborhood,address,latitude,longitude")
    .or("latitude.is.null,longitude.is.null");

  if (limit && limit > 0) query = query.limit(limit);

  const { data: venues, error: fetchErr } = await query;
  if (fetchErr) throw new Error(`Supabase fetch error: ${fetchErr.message}`);

  if (!venues || venues.length === 0) {
    console.log("No venues found with missing latitude/longitude. Done.");
    return;
  }

  console.log(`Found ${venues.length} venues needing geo.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  const MIN_INTERVAL_MS = 1100;
  let lastReqAt = 0;

  for (let i = 0; i < venues.length; i++) {
    const v = venues[i];
    const id = v.id;

    const needs = v.latitude == null || v.longitude == null;
    if (!needs) {
      skipped++;
      continue;
    }

    const q = buildAddressForQuery(v);
    if (!q || q.length < 3) {
      console.log(`[${i + 1}/${venues.length}] id=${id} SKIP (insufficient fields)`);
      skipped++;
      continue;
    }

    const now = Date.now();
    const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastReqAt));
    if (wait > 0) await sleep(wait);

    console.log(`[${i + 1}/${venues.length}] id=${id} geocode: "${q}"`);

    let geo = null;

    try {
      lastReqAt = Date.now();
      const resp = await geocodeNominatim({ q, userAgent: NOMINATIM_USER_AGENT });

      if (resp.kind === "rate_limited") {
        console.log(`  - Nominatim 429 rate limited; backing off 5s and retrying once...`);
        await sleep(5000);
        lastReqAt = Date.now();
        const resp2 = await geocodeNominatim({ q, userAgent: NOMINATIM_USER_AGENT });
        if (resp2.kind === "ok") geo = parseLatLonFromNominatim(resp2.data);
        else {
          console.log(`  - geocode failed after retry (status ${resp2.status})`);
          failed++;
          continue;
        }
      } else if (resp.kind === "http_error") {
        console.log(`  - geocode http error (status ${resp.status})`);
        failed++;
        continue;
      } else {
        geo = parseLatLonFromNominatim(resp.data);
      }
    } catch (e) {
      console.log(`  - geocode exception: ${e?.message || String(e)}`);
      failed++;
      continue;
    }

    if (!geo) {
      console.log("  - no result");
      skipped++;
      continue;
    }

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