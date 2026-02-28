import { NextResponse } from 'next/server';
import { syncMatchesFromAPI } from '@/lib/syncMatches';



export async function GET() {
    console.log('Cron job: Starting match sync...');
    
    const result = await syncMatchesFromAPI();
  
    return NextResponse.json(result);
  }