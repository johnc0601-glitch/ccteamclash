import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {createServerTeamPageServices} from '@/core/createServerTeamPageServices';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';
import {hasSupabaseConfig} from '@/lib/supabase';
import type {RecordSummary} from '@/services/statistics/StatisticsTypes';
import {SupabaseStatisticsRepository} from '@/services/statistics/SupabaseStatisticsRepository';
import styles from './Scouting.module.css';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;
const param = (params: Params, key: string) => typeof params[key] === 'string' ? params[key] as string : '';
const record = (r: RecordSummary | undefined) => r ? [r.wins, r.losses, r.ties].join('–') : '—';
const number = (n: number | null | undefined) => n == null ? '—' : n.toFixed(1);

export default async function ScoutingPage({searchParams}: {searchParams?: Promise<Params>}) {
  const params = searchParams ? await searchParams : {};
  return <><SiteHeader/><main className={styles.page}><div className="shell">
    <header className={styles.header}><Link href="/captain">Captain Home</Link><h1>Team Scouting</h1><p>Research teams and players using official published results.</p></header>
    <ScoutingContent params={params}/>
  </div></main><Footer/></>;
}

async function ScoutingContent({params}: {params: Params}) {
  if (!hasSupabaseConfig()) return <p>Scouting is currently unavailable.</p>;
  const db = await createClient();
  const {data: {user}} = await db.auth.getUser();
  if (!user) return <p>Sign in with your approved captain or commissioner account.</p>;
  const repository = new SupabaseLaunchRepository(db);
  const profile = await repository.getProfileByUserId(user.id);
  if (!profile || profile.status !== 'Approved' || !['Captain', 'Commissioner'].includes(profile.role)) {
    return <p>Captain or commissioner access is required.</p>;
  }
  if (profile.role === 'Captain' && !profile.captainTeamId) return <p>No captain team has been assigned.</p>;
  try {
    const services = await createServerTeamPageServices();
    if (!services) return <p>Scouting is currently unavailable.</p>;
    const schedule = await createServerScheduleService();
    const [teamsRaw, seasonsRaw, active, events] = await Promise.all([
      repository.getTeams(), services.seasons.getAll(), services.seasons.getActive(),
      profile.captainTeamId ? schedule.getTeamEvents(profile.captainTeamId) : Promise.resolve([]),
    ]);
    const teams = teamsRaw.filter(t => t.active).sort((a,b) => a.name.localeCompare(b.name));
    const seasons = seasonsRaw.filter(s => s.published).sort((a,b) => b.year-a.year);
    const season = seasons.find(s => s.id === param(params,'season')) ?? seasons.find(s => s.id === active?.id) ?? seasons[0];
    const own = teams.find(t => t.id === profile.captainTeamId);
    const next = events.filter(e => e.bucket === 'upcoming').sort((a,b) => a.dateTime.getTime()-b.dateTime.getTime())[0];
    const opponent = next && own ? (next.homeTeamId === own.id ? next.awayTeamId : next.homeTeamId) : undefined;
    const selected = teams.find(t => t.id === param(params,'team')) ?? teams.find(t => t.id === opponent) ?? teams.find(t => t.id !== own?.id) ?? teams[0];
    if (!season || !selected) return <p>No published season or team is available.</p>;
    const tab = ['team','players','history'].includes(param(params,'tab')) ? param(params,'tab') : 'team';
    const url = (extra: Record<string,string>) => '/captain/scouting?' + new URLSearchParams({team:selected.id,season:season.id,tab,...extra}).toString();
    const controls = <><form method="get" className={styles.controls}>
      <input type="hidden" name="tab" value={tab}/>
      <label>Team<select name="team" defaultValue={selected.id}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label>Season<select name="season" defaultValue={season.id}>{seasons.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <button type="submit">View</button>
    </form><nav aria-label="Scouting sections" className={styles.tabs}>{['team','players','history'].map(t=><Link key={t} aria-current={tab===t?'page':undefined} href={url({tab:t})}>{t[0].toUpperCase()+t.slice(1)}</Link>)}</nav></>;
    if (tab === 'players') {
      if (season.id !== active?.id) return <>{controls}<p>Historical season roster research is not yet available. Select the current season.</p></>;
      const [players, memberships] = await Promise.all([
        repository.getPlayers(),
        (db as any).from('launch_season_roster_memberships').select('player_id,roster_category').eq('season_id',season.id).eq('team_id',selected.id).eq('status','Active'),
      ]);
      if (memberships.error) throw memberships.error;
      const categories = new Map<string,string>((memberships.data ?? []).map((m: {player_id:string;roster_category:string})=>[m.player_id,m.roster_category]));
      const roster = players.filter(p=>p.active && categories.has(p.id));
      const snapshot = await services.statistics.getPlayerSeasonStatisticsSnapshot(roster.map(p=>p.id),season.id);
      const stats = new Map(snapshot.statistics.map(s=>[s.playerId,s]));
      const query = param(params,'q').trim().toLowerCase();
      const category = param(params,'category');
      const sort = param(params,'sort') || 'ci';
      const score = (p: typeof roster[number]) => sort==='pdga' ? p.pdgaRating ?? -Infinity : sort==='change' ? snapshot.ciMovements.get(p.id)?.ciGain ?? -Infinity : sort==='singles' ? stats.get(p.id)?.singlesRecord.wins ?? 0 : sort==='doubles' ? stats.get(p.id)?.doublesRecord.wins ?? 0 : p.clashIndex ?? -Infinity;
      const rows = roster.filter(p=>p.name.toLowerCase().includes(query)&&(!category||categories.get(p.id)===category)).sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name));
      const player = roster.find(p=>p.id===param(params,'player'));
      const history = player ? (await services.statistics.getPlayerMatchHistoriesForPlayers([player.id],100,season.id)).get(player.id) ?? [] : [];
      return <>{controls}<section className={styles.panel}><h2>{selected.name} · Full season roster</h2><p>Current ratings · Records are wins–losses–ties.</p>
      <form method="get" className={styles.controls}><input type="hidden" name="tab" value="players"/><input type="hidden" name="team" value={selected.id}/><input type="hidden" name="season" value={season.id}/>
      <label>Player<input name="q" defaultValue={param(params,'q')} placeholder="Search name"/></label><label>Category<select name="category" defaultValue={category}><option value="">All</option>{['Men','Women','Junior'].map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Sort<select name="sort" defaultValue={sort}>{[['ci','Highest CI'],['pdga','Highest PDGA'],['singles','Singles wins'],['doubles','Doubles wins'],['change','CI gain']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><button>Apply</button></form>
      <table className={styles.table}><thead><tr><th>Player</th><th>CI</th><th className={styles.secondary}>PDGA</th><th>Singles</th><th>Doubles</th><th className={styles.secondary}>CI ±</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><Link href={url({player:p.id,q:param(params,'q'),category,sort})+'#player-detail'}>{p.name}</Link></td><td>{p.clashIndex ?? '—'}{p.clashIndex != null && p.clashIndexProvisional?'*':''}</td><td className={styles.secondary}>{p.pdgaRating ?? '—'}</td><td>{record(stats.get(p.id)?.singlesRecord)}</td><td>{record(stats.get(p.id)?.doublesRecord)}</td><td className={styles.secondary}>{snapshot.ciMovements.get(p.id)?.ciGain ?? '—'}</td></tr>)}</tbody></table>
      {!rows.length&&<p>No matching roster players.</p>}<small>* Provisional CI. — Unavailable.</small></section>
      {player&&<section id="player-detail" className={styles.panel}><h2>{player.name}</h2><p>Current CI: {player.clashIndex ?? '—'} · PDGA: {player.pdgaRating ?? '—'}</p><h3>Contest history</h3>{history.length ? <table className={styles.table}><thead><tr><th>Date / Format</th><th>Opponents / Partner</th><th>Result</th></tr></thead><tbody>{history.map(h=><tr key={h.id}><td>{h.date}<br/>{h.format}</td><td>{h.opponentPlayerNames.join(', ')||'—'}{h.partnerPlayerNames.length>0&&<><br/><small>Partner: {h.partnerPlayerNames.join(', ')}</small></>}</td><td>{h.outcome}</td></tr>)}</tbody></table>:<p>No published contest history in this season.</p>}</section>}</>;
    }
    const results = await new SupabaseStatisticsRepository(db).getPublishedChallengeResults();
    const relevant = results.filter(r=>r.seasonId===season.id&&(r.homeTeamId===selected.id||r.awayTeamId===selected.id)).sort((a,b)=>b.date.localeCompare(a.date));
    const names = new Map(teamsRaw.map(t=>[t.id,t.name]));
    const meetings = own && own.id!==selected.id ? results.filter(r=>[r.homeTeamId,r.awayTeamId].includes(own.id)&&[r.homeTeamId,r.awayTeamId].includes(selected.id)).sort((a,b)=>b.date.localeCompare(a.date)) : [];
    const resultTable = (items: typeof results) => items.length ? <table className={styles.table}><thead><tr><th>Date</th><th>Opponent</th><th>Score</th></tr></thead><tbody>{items.map(r=><tr key={r.id}><td><Link href={'/matches/'+r.challengeId}>{r.date}</Link></td><td>{names.get(r.homeTeamId===selected.id?r.awayTeamId:r.homeTeamId) ?? '—'}</td><td>{r.homeTeamId===selected.id?r.homeScore:r.awayScore}–{r.homeTeamId===selected.id?r.awayScore:r.homeScore}</td></tr>)}</tbody></table> : <p>No published results.</p>;
    if (tab==='history') return <>{controls}<section className={styles.panel}><h2>{own && own.id!==selected.id ? own.name+' vs '+selected.name+' · All seasons' : selected.name+' · Selected season'}</h2>{resultTable(own && own.id!==selected.id?meetings:relevant)}</section></>;
    const ids = own && own.id!==selected.id ? [own.id,selected.id] : [selected.id];
    const overview = await services.statistics.getMatchdayTeamStatisticsForTeams(ids,season.id,season.id);
    return <>{controls}<section className={styles.panel}><h2>Team comparison</h2><table className={styles.table}><thead><tr><th>Statistic</th>{ids.map(id=><th key={id}>{names.get(id)}</th>)}</tr></thead><tbody>
    {[
      ['Record',(id:string)=>record(overview.current.find(s=>s.teamId===id)?.record)],
      ['Matches',(id:string)=>overview.current.find(s=>s.teamId===id)?.matchesPlayed ?? '—'],
      ['Points %',(id:string)=>{const s=overview.current.find(s=>s.teamId===id);return s?.matchesPlayed?number(s.pointsPercentage)+'%':'—';}],
      ['Avg. points',(id:string)=>{const s=overview.current.find(s=>s.teamId===id);return s?.matchesPlayed?number(s.pointsFor/s.matchesPlayed):'—';}],
      ['Singles W–L–T',(id:string)=>record(overview.previousFormats.find(s=>s.teamId===id)?.singlesRecord)],
      ['Doubles W–L–T',(id:string)=>record(overview.previousFormats.find(s=>s.teamId===id)?.doublesRecord)],
      ['Home record',(id:string)=>record(overview.current.find(s=>s.teamId===id)?.homeRecord)],
      ['Away record',(id:string)=>record(overview.current.find(s=>s.teamId===id)?.awayRecord)],
    ].map(([label, fn])=><tr key={String(label)}><td>{String(label)}</td>{ids.map(id=><td key={id}>{(fn as (id:string)=>string|number)(id)}</td>)}</tr>)}</tbody></table></section>
    <section className={styles.panel}><h2>{selected.name} · Recent results</h2>{resultTable(relevant)}</section></>;
  } catch {return <p>Scouting data could not load. Please try again.</p>;}
}
