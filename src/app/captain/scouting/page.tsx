import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {createServerTeamPageServices} from '@/core/createServerTeamPageServices';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import {isMatchRosterLocked} from '@/domain/match-roster/MatchRosterLock';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createPublicStandingsService} from '@/core/createPublicStandingsService';
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
      const current = season.id === active?.id;
      const published = await new SupabaseStatisticsRepository(db).getPublishedChallengeResults();
      const seasonResults = published.filter(r=>r.seasonId===season.id);
      const teamResults = seasonResults.filter(r=>r.homeTeamId===selected.id||r.awayTeamId===selected.id);
      const teamEvents = current ? await schedule.getTeamEvents(selected.id) : [];
      const upcoming = teamEvents.filter(e=>e.bucket==='upcoming').sort((a,b)=>a.dateTime.getTime()-b.dateTime.getTime())[0];
      const choices = [
        ...(upcoming ? [{id:upcoming.id,label:'Upcoming · '+upcoming.date}] : []),
        ...teamResults.sort((a,b)=>b.date.localeCompare(a.date)).map(r=>({id:r.challengeId,label:r.date})),
      ];
      const matchChoice = choices.find(c=>c.id===param(params,'match')) ?? (upcoming ? choices[0] : undefined);
      let lockedIds: Set<string> | undefined;
      let lockedNotice = '';
      if (matchChoice) {
        const matchRepo = new SupabaseMatchRosterRepository(db);
        try {
          const match = await matchRepo.getAttendanceMatch(matchChoice.id);
          if (match && match.status!=='Cancelled' && isMatchRosterLocked(match) && [match.homeTeamId,match.awayTeamId].includes(selected.id)) {
            // Captains can only read their own unlock rows under RLS. Check the selected match on the server,
            // and never expose unlock details or draft attendance. No roster mutation from scouting.
            if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw Error('Unlock status unavailable');
            const {data: unlocks,error: unlockError} = await (createAdminClient() as any).from('launch_match_roster_unlocks').select('team_id').eq('match_id',matchChoice.id).is('relocked_at',null);
            if (unlockError) throw unlockError;
            if (unlocks?.length) lockedNotice='Roster reopened; showing season roster only.';
            else if (await matchRepo.hasCompleteSnapshot(matchChoice.id)) {
              const official = (await matchRepo.getOfficialMatchRosters(matchChoice.id)).find(r=>r.teamId===selected.id);
              if (official) lockedIds=new Set(official.players.map(p=>p.playerId));
            }
            if (!lockedIds && !lockedNotice) lockedNotice='Official roster is not available yet.';
          }
        } catch {lockedNotice='Official roster status could not be verified.';}
      }
      const rosterMode = lockedIds && param(params,'roster')!=='full' ? 'locked' : 'full';
      const view = param(params,'view')==='ratings'?'ratings':'records';
      const scope = param(params,'scope')==='career'?'career':'season';
      const [players, memberships] = await Promise.all([
        repository.getPlayers(),
        (db as any).from('launch_season_roster_memberships').select('player_id,roster_category').eq('season_id',season.id).eq('team_id',selected.id).eq('status','Active'),
      ]);
      if (memberships.error) throw memberships.error;
      const categories = new Map<string,string>((memberships.data ?? []).map((m: {player_id:string;roster_category:string})=>[m.player_id,m.roster_category]));
      const historicalNames = new Map(teamResults.flatMap(r=>r.playerResults.filter(p=>p.teamId===selected.id).map(p=>[p.playerId,p.playerName] as const)));
      const roster = players.filter(p=>rosterMode==='locked'?lockedIds?.has(p.id):current?p.active&&categories.has(p.id):categories.has(p.id)||historicalNames.has(p.id));
      // Current ratings are not historical season ratings; hide them for past seasons.
      const ci = (p:typeof roster[number])=>current?p.clashIndex:null;
      const pdga = (p:typeof roster[number])=>current?p.pdgaRating:null;
      const snapshot = await services.statistics.getPlayerSeasonStatisticsSnapshot(roster.map(p=>p.id),season.id);
      const stats = new Map((scope==='career'?await services.statistics.getPlayerCareerStatisticsForPlayers(roster.map(p=>p.id)):snapshot.statistics).map(s=>[s.playerId,s]));
      const query = param(params,'q').trim().toLowerCase();
      const category = param(params,'category');
      const sort = param(params,'sort') || 'ci';
      const score = (p: typeof roster[number]) => sort==='pdga' ? pdga(p) ?? -Infinity : sort==='change' ? snapshot.ciMovements.get(p.id)?.ciGain ?? -Infinity : sort==='singles' ? stats.get(p.id)?.singlesRecord.wins ?? 0 : sort==='doubles' ? stats.get(p.id)?.doublesRecord.wins ?? 0 : ci(p) ?? -Infinity;
      const rows = roster.filter(p=>p.name.toLowerCase().includes(query)&&(!category||categories.get(p.id)===category)).sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name));
      const player = roster.find(p=>p.id===param(params,'player'));
      const history = player ? (await services.statistics.getPlayerMatchHistoriesForPlayers([player.id],100,scope==='career'?undefined:season.id)).get(player.id) ?? [] : [];
      const historyMatchIds = [...new Set(history.map(h=>h.challengeId))];
      const ratingRows = player && historyMatchIds.length ? await (db as any).from('clash_contest_rating_facts').select('match_id,contest_id,clash_index_before,opponent_effective_ci,ci_delta').eq('player_id',player.id).in('match_id',historyMatchIds) : null;
      const facts = (ratingRows?.error ? [] : ratingRows?.data ?? []) as Array<{match_id:string;contest_id:string;clash_index_before:number;opponent_effective_ci:number;ci_delta:number}>;
      const progression = new Map<string,{date:string;before:number;after:number}>();
      for (const fact of facts) {
        const date=published.find(r=>r.challengeId===fact.match_id)?.date;
        if (!date) continue;
        const row=progression.get(fact.match_id)??{date,before:fact.clash_index_before,after:fact.clash_index_before};
        row.after+=fact.ci_delta;
        progression.set(fact.match_id,row);
      }
      const timeline=[...progression.entries()].sort((a,b)=>a[1].date.localeCompare(b[1].date));
      const partners = new Map<string,{name:string;wins:number;losses:number;ties:number}>();
      if (player) for (const r of (scope==='career'?published:seasonResults)) for (const entry of r.playerResults.filter(p=>p.playerId===player.id&&p.format==='Doubles'&&p.contestId)) {
        const group=r.playerResults.filter(p=>p.contestId===entry.contestId);
        const partner=group.find(p=>p.teamId===entry.teamId&&p.playerId!==player.id);
        if (!partner||group.filter(p=>p.teamId!==entry.teamId).length<2) continue;
        const row=partners.get(partner.playerId)??{name:partner.playerName,wins:0,losses:0,ties:0};
        if(entry.outcome==='Win')row.wins++;else if(entry.outcome==='Loss')row.losses++;else row.ties++;
        partners.set(partner.playerId,row);
      }
      return <>{controls}<section className={styles.panel}><h2>{selected.name} · {rosterMode==='locked'?'Official playing roster':current?'Full season roster':'Recorded season players'}</h2><p>{current?'Current ratings, not frozen match ratings.':'Historical roster coverage may be incomplete; current ratings are hidden.'} Records are wins–losses–ties.</p>
      {lockedNotice&&<p>{lockedNotice}</p>}
      <form method="get" className={styles.controls}><input type="hidden" name="tab" value="players"/><input type="hidden" name="team" value={selected.id}/><input type="hidden" name="season" value={season.id}/>
      <label>Match<select name="match" defaultValue={matchChoice?.id??''}><option value="">Automatic</option>{choices.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select></label>
      <label>Roster<select name="roster" defaultValue={param(params,'roster')||'auto'}><option value="auto">Automatic / locked when available</option><option value="full">Season roster</option></select></label>
      <label>Records<select name="scope" defaultValue={scope}><option value="season">Selected season</option><option value="career">Career</option></select></label>
      <label>Columns<select name="view" defaultValue={view}><option value="records">Records</option><option value="ratings">Ratings</option></select></label>
      <label>Player<input name="q" defaultValue={param(params,'q')} placeholder="Search name"/></label><label>Category<select name="category" defaultValue={category}><option value="">All</option>{['Men','Women','Junior'].map(c=><option key={c}>{c}</option>)}</select></label>
      <label>Sort<select name="sort" defaultValue={sort}>{[['ci','Highest CI'],['pdga','Highest PDGA'],['singles','Singles wins'],['doubles','Doubles wins'],['change','CI gain']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><button>Apply</button></form>
      <table className={`${styles.table} ${view==='ratings'?styles.ratingView:styles.recordView}`}><thead><tr><th>Player</th><th>CI</th><th className={styles.secondary}>PDGA</th><th className={styles.recordColumn}>Singles</th><th className={styles.recordColumn}>Doubles</th><th className={styles.secondary}>CI ±</th></tr></thead><tbody>{rows.map(p=><tr key={p.id}><td><Link href={url({player:p.id,q:param(params,'q'),category,sort,view,scope,match:matchChoice?.id??'',roster:param(params,'roster')||'auto'})+'#player-detail'}>{p.name}</Link></td><td>{ci(p) ?? '—'}{ci(p) != null && p.clashIndexProvisional?'*':''}</td><td className={styles.secondary}>{pdga(p) ?? '—'}</td><td className={styles.recordColumn}>{record(stats.get(p.id)?.singlesRecord)}</td><td className={styles.recordColumn}>{record(stats.get(p.id)?.doublesRecord)}</td><td className={styles.secondary}>{snapshot.ciMovements.get(p.id)?.ciGain ?? '—'}</td></tr>)}</tbody></table>
      {!rows.length&&<p>No matching roster players.</p>}<small>* Provisional CI. — Unavailable.</small></section>
      {player&&<section id="player-detail" className={styles.panel}><h2>{player.name}</h2><p>Current CI: {ci(player) ?? '—'} · PDGA: {pdga(player) ?? '—'}</p><h3>Published CI history</h3>{timeline.length?<table className={styles.table}><thead><tr><th>Match date</th><th>Before</th><th>After</th></tr></thead><tbody>{timeline.map(([id,p])=><tr key={id}><td>{p.date}</td><td>{p.before}</td><td>{p.after}</td></tr>)}</tbody></table>:<p>No verified rating snapshots available.</p>}<h3>Doubles partners · {scope==='career'?'Career':'Selected season'}</h3>{partners.size?<table className={styles.table}><thead><tr><th>Partner</th><th>Played</th><th>W–L–T</th></tr></thead><tbody>{[...partners.entries()].sort((a,b)=>(b[1].wins+b[1].losses+b[1].ties)-(a[1].wins+a[1].losses+a[1].ties)).map(([id,p])=><tr key={id}><td>{p.name}</td><td>{p.wins+p.losses+p.ties}</td><td>{record(p)}</td></tr>)}</tbody></table>:<p>No recorded complete doubles partnerships.</p>}<h3>Contest history</h3>{history.length ? <table className={styles.table}><thead><tr><th>Date / Format</th><th>Opponents / Partner</th><th>Result</th></tr></thead><tbody>{history.map(h=><tr key={h.id}><td>{h.date}<br/>{h.format}</td><td>{h.opponentPlayerNames.join(', ')||'—'}{h.partnerPlayerNames.length>0&&<><br/><small>Partner: {h.partnerPlayerNames.join(', ')}</small></>}</td><td>{h.outcome}{facts.find(f=>f.match_id===h.challengeId&&h.id.startsWith(f.contest_id+':'))&&<><br/><small>Opp. CI: {number(facts.find(f=>f.match_id===h.challengeId&&h.id.startsWith(f.contest_id+':'))?.opponent_effective_ci)}</small></>}</td></tr>)}</tbody></table>:<p>No published contest history in this season.</p>}</section>}</>;
    }
    const results = await new SupabaseStatisticsRepository(db).getPublishedChallengeResults();
    const relevant = results.filter(r=>r.seasonId===season.id&&(r.homeTeamId===selected.id||r.awayTeamId===selected.id)).sort((a,b)=>b.date.localeCompare(a.date));
    const names = new Map(teamsRaw.map(t=>[t.id,t.name]));
    const meetings = own && own.id!==selected.id ? results.filter(r=>[r.homeTeamId,r.awayTeamId].includes(own.id)&&[r.homeTeamId,r.awayTeamId].includes(selected.id)).sort((a,b)=>b.date.localeCompare(a.date)) : [];
    const resultTable = (items: typeof results) => items.length ? <table className={styles.table}><thead><tr><th>Date</th><th>Opponent</th><th>Score</th></tr></thead><tbody>{items.map(r=><tr key={r.id}><td><Link href={'/matches/'+r.challengeId}>{r.date}</Link></td><td>{names.get(r.homeTeamId===selected.id?r.awayTeamId:r.homeTeamId) ?? '—'}</td><td>{r.homeTeamId===selected.id?r.homeScore:r.awayScore}–{r.homeTeamId===selected.id?r.awayScore:r.homeScore}</td></tr>)}</tbody></table> : <p>No published results.</p>;
    if (tab==='history') return <>{controls}<section className={styles.panel}><h2>{own && own.id!==selected.id ? own.name+' vs '+selected.name+' · All seasons' : selected.name+' · Selected season'}</h2>{resultTable(own && own.id!==selected.id?meetings:relevant)}</section></>;
    const ids = own && own.id!==selected.id ? [own.id,selected.id] : [selected.id];
    const overview = await services.statistics.getMatchdayTeamStatisticsForTeams(ids,season.id,season.id);
    const standings = await createPublicStandingsService().getSeasonStandings(season.id).catch(()=>[]);
    const averages = new Map<string,{average:number;count:number}>();
    if (season.id===active?.id) {
      const [allPlayers, memberships] = await Promise.all([repository.getPlayers(),(db as any).from('launch_season_roster_memberships').select('player_id,team_id').eq('season_id',season.id).eq('status','Active').in('team_id',ids)]);
      if (!memberships.error) {
        const ratings=new Map(allPlayers.filter(p=>p.active&&p.clashIndex!=null).map(p=>[p.id,p.clashIndex as number]));
        for(const id of ids){
          const memberIds=new Set<string>((memberships.data??[]).filter((m:{team_id:string})=>m.team_id===id).map((m:{player_id:string})=>m.player_id));
          const values=[...memberIds].flatMap(pid=>ratings.has(pid)?[ratings.get(pid)!]:[]);
          if(values.length) averages.set(id,{average:values.reduce((a,b)=>a+b,0)/values.length,count:values.length});
        }
      }
    }
    return <>{controls}<section className={styles.panel}><h2>Team comparison</h2><p>Published results. Contest percentages award half credit for ties; team points include official adjustments.</p><table className={styles.table}><thead><tr><th>Statistic</th>{ids.map(id=><th key={id}>{names.get(id)}</th>)}</tr></thead><tbody>
    {[
      ['Record',(id:string)=>record(overview.current.find(s=>s.teamId===id)?.record)],
      ['League rank',(id:string)=>standings.find(s=>s.team.id===id)?.rank ?? '—'],
      ['Avg. season roster CI',(id:string)=>{const a=averages.get(id);return a?number(a.average)+' ('+a.count+' rated)':'—';}],
      ['Matches',(id:string)=>overview.current.find(s=>s.teamId===id)?.matchesPlayed ?? '—'],
      ['Points %',(id:string)=>{const s=overview.current.find(s=>s.teamId===id);return s?.matchesPlayed?number(s.pointsPercentage)+'%':'—';}],
      ['Avg. points',(id:string)=>{const s=overview.current.find(s=>s.teamId===id);return s?.matchesPlayed?number(s.pointsFor/s.matchesPlayed):'—';}],
      ['Singles W–L–T',(id:string)=>record(overview.previousFormats.find(s=>s.teamId===id)?.singlesRecord)],
      ['Doubles W–L–T',(id:string)=>record(overview.previousFormats.find(s=>s.teamId===id)?.doublesRecord)],
      ['Singles contest %',(id:string)=>{const f=overview.previousFormats.find(s=>s.teamId===id);return f&&f.singlesRecord.wins+f.singlesRecord.losses+f.singlesRecord.ties>0?number(f.singlesWinPercentage)+'%':'—';}],
      ['Doubles contest %',(id:string)=>{const f=overview.previousFormats.find(s=>s.teamId===id);return f&&f.doublesRecord.wins+f.doublesRecord.losses+f.doublesRecord.ties>0?number(f.doublesWinPercentage)+'%':'—';}],
      ['Home record',(id:string)=>record(overview.current.find(s=>s.teamId===id)?.homeRecord)],
      ['Away record',(id:string)=>record(overview.current.find(s=>s.teamId===id)?.awayRecord)],
    ].map(([label, fn])=><tr key={String(label)}><td>{String(label)}</td>{ids.map(id=><td key={id}>{(fn as (id:string)=>string|number)(id)}</td>)}</tr>)}</tbody></table></section>
    <section className={styles.panel}><h2>{selected.name} · Recent results</h2>{resultTable(relevant)}</section></>;
  } catch {return <p>Scouting data could not load. Please try again.</p>;}
}
