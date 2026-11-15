import {levelupAccess, readSnapshot} from '@/lib/levelup/server';
import {csv} from '@/lib/levelup/model';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const {db, owner} = await levelupAccess();
  if (!owner) return new Response('Access denied', {status: 403, headers: {'Cache-Control': 'no-store'}});
  const {data} = await readSnapshot(db, owner);
  const kind = new URL(request.url).searchParams.get('kind');
  let content: string, name: string, type: string;
  if (kind === 'attendance') {
    content = csv([['Season','Event','Date','Player','Status'], ...data.attendance.map(a => {const e=data.events.find(e=>e.id===a.eventId);return [data.seasons.find(s=>s.id===e?.seasonId)?.name,e?.name,e?.date,data.players.find(p=>p.id===a.playerId)?.name,a.status];})]); name='Level-UP-attendance.csv';type='text/csv;charset=utf-8';
  } else if (kind === 'measurements') {
    content=csv([['Player','Season','Date','Type','Value','Unit','Reported age','Notes','Source'],...data.measurements.map(m=>[data.players.find(p=>p.id===m.playerId)?.name,data.seasons.find(s=>s.id===m.seasonId)?.name,m.date,m.kind,m.value,m.unit,m.age,m.notes,m.source])]);name='Level-UP-measurements.csv';type='text/csv;charset=utf-8';
  } else {
    const archive=await db.from('levelup_source_archives').select('data').eq('owner_id',owner).single();
    if(archive.error) return new Response('Backup unavailable. Try again.',{status:503});
    content=JSON.stringify({exportedAt:new Date().toISOString(),data,originalSources:archive.data.data},null,2);name='Level-UP-complete-backup.json';type='application/json';
  }
  return new Response(content,{headers:{'Content-Type':type,'Content-Disposition':`attachment; filename="${name}"`,'Cache-Control':'private, no-store','X-Robots-Tag':'noindex, nofollow'}});
}
