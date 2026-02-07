import { NextResponse } from 'next/server';
import { syncMatchesFromAPI } from '@/lib/syncMatches';

export async function GET(request: Request) {
  // Optional: Add authentication here to protect this endpoint
  //const authHeader = request.headers.get('authorization');
  //const expectedToken = process.env.SYNC_SECRET_TOKEN;

  //if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
   // return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  //}

  const result = await syncMatchesFromAPI();

  if (result.success) {
    return NextResponse.json({ 
      success: true, 
      count: result.count,
      message: result.message 
    });
  } else {
    return NextResponse.json({ 
      success: false, 
      error: result.error 
    }, { status: 500 });
  }
}