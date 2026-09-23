import {unstable_cache} from 'next/cache';
import {createPublicClient} from '@/lib/supabase/public';

export type ClashPulseItem = {
  id: string;
  category: string;
  text: string;
  publishedAt: string;
};

const getCachedHomepageClashPulseItems = unstable_cache(
  async (): Promise<ClashPulseItem[]> => {
    const supabase = createPublicClient();
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
  },
  ['homepage-clash-pulse-v1'],
  {revalidate: 3_600, tags: ['public:clash-pulse']},
);

export async function getHomepageClashPulseItems(): Promise<ClashPulseItem[]> {
  return getCachedHomepageClashPulseItems();
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
