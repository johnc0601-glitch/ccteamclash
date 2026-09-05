type SupabaseLike = {
  from: (table: string) => any;
};

export type MatchPublicIdentity = {
  matchId: string;
  publicSlug: string | null;
};

export type ResolvedMatchPublicReference = MatchPublicIdentity & {
  matchedBy: 'id' | 'slug' | 'alias';
};

export function publicMatchHref(identity: MatchPublicIdentity): string {
  return `/matches/${encodeURIComponent(identity.publicSlug || identity.matchId)}`;
}

export async function getPublicMatchHref(
  supabase: SupabaseLike,
  matchId: string,
): Promise<string> {
  const identities = await getMatchPublicIdentities(supabase, [matchId]);
  return publicMatchHref(identities.get(matchId) ?? {matchId, publicSlug: null});
}

export async function getMatchPublicIdentities(
  supabase: SupabaseLike,
  matchIds: string[],
): Promise<Map<string, MatchPublicIdentity>> {
  const ids = [...new Set(matchIds.filter(Boolean))];
  if (!ids.length) return new Map();

  const {data, error} = await supabase
    .from('launch_schedule_matches')
    .select('id,public_slug')
    .in('id', ids);

  if (error) {
    // During staged rollout the application may build before the additive
    // migration is applied. Preserve the legacy URL rather than breaking
    // schedule pages during that window.
    if (isIdentitySchemaUnavailable(error)) {
      return new Map(ids.map((id) => [id, {matchId: id, publicSlug: null}]));
    }
    throw error;
  }

  return new Map((data ?? []).map((row: {id: string; public_slug: string | null}) => [
    row.id,
    {matchId: row.id, publicSlug: row.public_slug},
  ]));
}

export async function resolveMatchPublicReference(
  supabase: SupabaseLike,
  reference: string,
): Promise<ResolvedMatchPublicReference | undefined> {
  const decodedReference = safeDecode(reference);

  const direct = await supabase
    .from('launch_schedule_matches')
    .select('id,public_slug')
    .eq('id', decodedReference)
    .maybeSingle();

  if (direct.error) {
    if (isIdentitySchemaUnavailable(direct.error)) {
      const fallback = await supabase
        .from('launch_schedule_matches')
        .select('id')
        .eq('id', decodedReference)
        .maybeSingle();
      if (fallback.error) throw fallback.error;
      return fallback.data
        ? {matchId: fallback.data.id, publicSlug: null, matchedBy: 'id'}
        : undefined;
    }
    throw direct.error;
  }
  if (direct.data) {
    return {
      matchId: direct.data.id,
      publicSlug: direct.data.public_slug,
      matchedBy: 'id',
    };
  }

  const bySlug = await supabase
    .from('launch_schedule_matches')
    .select('id,public_slug')
    .eq('public_slug', decodedReference)
    .maybeSingle();
  if (bySlug.error) {
    if (isIdentitySchemaUnavailable(bySlug.error)) return undefined;
    throw bySlug.error;
  }
  if (bySlug.data) {
    return {
      matchId: bySlug.data.id,
      publicSlug: bySlug.data.public_slug,
      matchedBy: 'slug',
    };
  }

  const alias = await supabase
    .from('launch_match_url_aliases')
    .select('match_id')
    .eq('alias', decodedReference)
    .maybeSingle();
  if (alias.error) {
    if (isIdentitySchemaUnavailable(alias.error)) return undefined;
    throw alias.error;
  }
  if (!alias.data?.match_id) return undefined;

  const canonical = await supabase
    .from('launch_schedule_matches')
    .select('id,public_slug')
    .eq('id', alias.data.match_id)
    .maybeSingle();
  if (canonical.error) throw canonical.error;
  if (!canonical.data) return undefined;

  return {
    matchId: canonical.data.id,
    publicSlug: canonical.data.public_slug,
    matchedBy: 'alias',
  };
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isIdentitySchemaUnavailable(error: {code?: string; message?: string}): boolean {
  return error.code === '42703'
    || error.code === '42P01'
    || /public_slug|launch_match_url_aliases/i.test(error.message ?? '');
}
