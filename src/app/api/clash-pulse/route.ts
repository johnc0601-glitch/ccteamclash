import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CATEGORIES = new Set([
  'Streak',
  'Upset',
  'Clash Index',
  'Ranking',
  'Milestone',
  'History',
  'Series',
  'Doubles',
  'Record',
  'League',
]);

function failure(error: unknown) {
  if (error instanceof StoryAccessError) {
    return Response.json({error: error.message}, {status: error.status});
  }
  const message = error instanceof Error ? error.message : 'Clash Pulse request failed.';
  console.error('[clash-pulse] Commissioner request failed', {message});
  return Response.json({error: message}, {status: 500});
}

function mapItem(row: any) {
  return {
    id: String(row.id),
    category: String(row.category),
    text: String(row.fact_text),
    publishedAt: String(row.published_at),
    expiresAt: row.expires_at ? String(row.expires_at) : null,
  };
}

export async function GET() {
  try {
    const {supabase} = await requireStoryCommissioner();
    const {data, error} = await (supabase as any)
      .from('clash_pulse_items')
      .select('id,category,fact_text,published_at,expires_at')
      .eq('is_active', true)
      .order('published_at', {ascending: false})
      .limit(20);

    if (error) throw error;
    return Response.json({items: (data ?? []).map(mapItem)});
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const {supabase} = await requireStoryCommissioner();
    const body = await request.json().catch(() => ({})) as {category?: string; text?: string};
    const category = body.category?.trim() ?? '';
    const text = body.text?.trim() ?? '';

    if (!CATEGORIES.has(category)) {
      return Response.json({error: 'Choose a valid Clash Pulse category.'}, {status: 400});
    }
    if (!text || text.length > 240) {
      return Response.json({error: 'Clash Pulse facts must be between 1 and 240 characters.'}, {status: 400});
    }

    const now = new Date().toISOString();
    const {data, error} = await (supabase as any)
      .from('clash_pulse_items')
      .insert({
        category,
        fact_text: text,
        is_active: true,
        published_at: now,
        updated_at: now,
      })
      .select('id,category,fact_text,published_at,expires_at')
      .single();

    if (error) throw error;
    return Response.json({item: mapItem(data)}, {status: 201});
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const {supabase} = await requireStoryCommissioner();
    const body = await request.json().catch(() => ({})) as {id?: string};
    const id = body.id?.trim() ?? '';
    if (!id) return Response.json({error: 'Clash Pulse item ID is required.'}, {status: 400});

    const {error} = await (supabase as any)
      .from('clash_pulse_items')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;
    return Response.json({removed: true});
  } catch (error) {
    return failure(error);
  }
}
