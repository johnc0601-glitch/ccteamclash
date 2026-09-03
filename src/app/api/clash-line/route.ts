import {createClient} from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ClashLineRow = {
  id: string;
  trigger_type: string;
  fact_text: string;
  season_id: string | null;
  event_id: string | null;
  match_id: string | null;
  published_at: string;
};

function cacheControl(): string {
  return process.env.VERCEL_ENV === 'preview'
    ? 'no-store'
    : 'public, s-maxage=5, stale-while-revalidate=15';
}

export async function GET() {
  const supabase = await createClient();
  const {data, error} = await (supabase as any)
    .from('clash_line_items')
    .select('id,trigger_type,fact_text,season_id,event_id,match_id,published_at')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('published_at', {ascending: false})
    .limit(12);

  if (error) {
    console.error('[clash-line] Public read failed', {message: error.message});
    return Response.json({items: []}, {
      status: 200,
      headers: {'Cache-Control': cacheControl()},
    });
  }

  const items = ((data ?? []) as ClashLineRow[]).map((row) => ({
    id: row.id,
    triggerType: row.trigger_type,
    text: row.fact_text,
    seasonId: row.season_id,
    eventId: row.event_id,
    matchId: row.match_id,
    publishedAt: row.published_at,
  }));

  return Response.json({items}, {
    headers: {'Cache-Control': cacheControl()},
  });
}
