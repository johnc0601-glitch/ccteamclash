import 'server-only';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
import {getSupabaseConfig} from '@/lib/supabase/config';
import type {LeagueState, Snapshot} from './model';

type Json = string | number | boolean | null | {[key: string]: Json | undefined} | Json[];
type Table<Row, Insert, Update> = {Row: Row; Insert: Insert; Update: Update; Relationships: []};
type Db = {public: {Tables: {
  levelup_owners: Table<{user_id: string}, never, never>;
  levelup_workspaces: Table<{owner_id: string; version: number; data: Json; updated_at: string}, never, {data?: Json; version?: number; updated_at?: string}>;
  levelup_source_archives: Table<{owner_id: string; data: Json}, never, never>;
}; Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never>}};

export async function levelupAccess() {
  const jar = await cookies();
  const {url, publishableKey} = getSupabaseConfig();
  const db = createServerClient<Db>(url, publishableKey, {cookies: {
    getAll: () => jar.getAll(),
    setAll(values) {try {values.forEach(({name, value, options}) => jar.set(name, value, options));} catch {/* Proxy refreshes cookies for server components. */}},
  }});
  const {data: {user}, error} = await db.auth.getUser();
  if (error || !user || !user.email_confirmed_at) return {db, owner: null};
  const {data} = await db.from('levelup_owners').select('user_id').eq('user_id', user.id).maybeSingle();
  return {db, owner: data?.user_id ?? null};
}

export async function readSnapshot(db: Awaited<ReturnType<typeof levelupAccess>>['db'], owner: string): Promise<Snapshot> {
  const {data, error} = await db.from('levelup_workspaces').select('version,data').eq('owner_id', owner).single();
  if (error || !data) throw new Error('Level UP records could not be loaded. Please try again.');
  return {version: data.version, data: data.data as unknown as LeagueState};
}
export const asJson = (data: LeagueState) => data as unknown as Json;
