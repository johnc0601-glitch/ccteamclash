import {NextRequest, NextResponse} from 'next/server';
import {persistHistoricalCiArchiveReplay} from '@/core/persistHistoricalCiArchiveReplay';

export const dynamic = 'force-dynamic';

const ONE_TIME_TOKEN = 'uAIz1_UVHERmr8f0F6WfGT_N2Cy9POHw7lfCwddeVWI';

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get('token') !== ONE_TIME_TOKEN) {
    return NextResponse.json({error: 'Not found'}, {status: 404});
  }

  try {
    const result = await persistHistoricalCiArchiveReplay();
    return NextResponse.json({ok: true, ...result});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Historical CI backfill failed';
    return NextResponse.json({ok: false, error: message}, {status: 500});
  }
}
