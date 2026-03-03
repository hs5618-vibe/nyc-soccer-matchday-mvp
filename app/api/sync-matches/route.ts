import { NextResponse } from "next/server";
import { syncMatchesFromAPI } from "@/lib/syncMatches";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const result = await syncMatchesFromAPI();
  return NextResponse.json(result);
}