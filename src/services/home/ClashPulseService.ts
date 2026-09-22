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
    text: shortenPulseTeamNames(String(row.fact_text)),
    publishedAt: String(row.published_at),
  }));
}


const TEAM_NAME_REPLACEMENTS: Array<[RegExp, string]> = [
  [/Hayneous OG[’']s/g, "OG's"],
  [/Cougar Country/g, 'CC'],
  [/Dark Knights/g, 'DK'],
  [/Kure Beach/g, 'KB'],
  [/Beast Mode/g, 'BM'],
  [/Wild Turkey/g, 'WT'],
  [/Riptide/g, 'RIP'],
  [/Ninjas/g, 'NIN'],
];

function shortenPulseTeamNames(text: string): string {
  return TEAM_NAME_REPLACEMENTS.reduce(
    (value, [pattern, replacement]) => value.replace(pattern, replacement),
    text,
  );
}
