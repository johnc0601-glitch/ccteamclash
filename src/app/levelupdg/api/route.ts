import {applyAction, type Action} from '@/lib/levelup/model';
import {asJson, levelupAccess, readSnapshot} from '@/lib/levelup/server';

export const dynamic = 'force-dynamic';
const headers = {'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow'};
const reply = (value: unknown, status = 200) => Response.json(value, {status, headers});
export async function GET() {
  const {db, owner} = await levelupAccess();
  if (!owner) return reply({error: 'Sign in with your authorized account.'}, 403);
  try {return reply(await readSnapshot(db, owner));} catch {return reply({error: 'Records could not be loaded. Try again.'}, 503);}
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({error: 'Invalid request origin.'}, 403);
  const {db, owner} = await levelupAccess();
  if (!owner) return reply({error: 'Sign in with your authorized account.'}, 403);
  try {
    const body = await request.text();
    if (body.length > 20000) return reply({error: 'This change is too large.'}, 413);
    const {version, action} = JSON.parse(body) as {version: number; action: Action};
    const current = await readSnapshot(db, owner);
    if (!Number.isSafeInteger(version) || current.version !== version) return reply({error: 'Another tab changed these records. The latest version has been loaded. Review and retry.', snapshot: current}, 409);
    let data;
    try {data = applyAction(current.data, action);} catch (e) {return reply({error: e instanceof Error ? e.message : 'Check the entered values.'}, 400);}
    const {data: saved, error} = await db.from('levelup_workspaces').update({data: asJson(data), version: version + 1, updated_at: new Date().toISOString()}).eq('owner_id', owner).eq('version', version).select('version').maybeSingle();
    if (error) return reply({error: 'Not saved. Please retry.'}, 503);
    if (!saved) return reply({error: 'Another tab saved first. Review the latest records and retry.', snapshot: await readSnapshot(db, owner)}, 409);
    return reply({version: saved.version, data});
  } catch {return reply({error: 'Unable to save. Check your connection and retry.'}, 503);}
}
