import {createClient} from '@/lib/supabase/server';

export type ClashPulseItem = {
  id: string;
  category: string;
  text: string;
  publishedAt: string;
};

export async function getHomepageClashPulseItems(): Promise<ClashPulseItem[]> {
  const supabase = await createClient();
  const {data, error} = await (supabase as any)
    .from('clash_pulse_items')
    .select('id,category,fact_text,published_at')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('published_at', {ascending: false})
    .limit(10);

  if (error) {
    console.error('[clash-pulse] Homepage read failed', {message: error.message});
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: String(row.id),
    category: String(row.category),
    text: String(row.fact_text),
    publishedAt: String(row.published_at),
  }));
}
