import {PlayerName} from '@/components/players/PlayerName';
import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {createServerTeamPageServices} from '@/core/createServerTeamPageServices';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createPublicStandingsService} from '@/core/createPublicStandingsService';
import {historicalClashTeamId} from '@/services/teamStrength/ClashChallengeInsights';
import type {RecordSummary} from '@/services/statistics/StatisticsTypes';
import {SupabaseStatisticsRepository} from '@/services/statistics/SupabaseStatisticsRepository';
import styles from './Scouting.module.css';
import {PrintScoutingButton} from './PrintScoutingButton';

export const dynamic = 'force-dynamic';

type Params = Record<string, string | string[] | undefined>;
const param = (params: Params, key: string) => typeof params[key] === 'string' ? params[key] as string : '';
const record = (r: RecordSummary | undefined) => r ? [r.wins, r.losses, r.ties].join('–') : '—';
const number = (n: number | null | undefined) => n == null ? '—' : n.toFixed(1);

export default async function ScoutingPage({searchParams}: {searchParams?: Promise<Params>}) {
  const params = searchParams ? await searchParams : {};
  if (param(params,'print')==='1') return <main className={styles.printPage}><ScoutingContent params={params}/></main>;
  return <><SiteHeader/><main className={styles.page}><div className="shell">
    <header className={styles.header}><Link href="/captain">Captain Home</Link><h1>Team Scouting</h1></header>
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
    const season = seasons.find(s => s.id === active?.id) ?? seasons[0];
    const own = teams.find(t => t.id === profile.captainTeamId);
    const next = events.filter(e => e.bucket === 'upcoming').sort((a,b) => a.dateTime.getTime()-b.dateTime.getTime())[0];
    const opponent = next && own ? (next.homeTeamId === own.id ? next.awayTeamId : next.homeTeamId) : undefined;
    const selected = teams.find(t => t.id === param(params,'team')) ?? teams.find(t => t.id === opponent) ?? teams.find(t => t.id !== own?.id) ?? teams[0];
    if (!season || !selected) return <p>No published season or team is available.</p>;
    const teamLogos = new Map(teamsRaw.map(t=>[t.id,t.logo]));
    const logo = (id:string,className:string) => {const src=teamLogos.get(id);return src?<img src={src} className={className} alt="" />:null;};
    const printable = param(params,'print')==='1';
    const tab = !printable && ['players','team','history'].includes(param(params,'tab')) ? param(params,'tab') : 'players';
    const url = (extra: Record<string,string>) => '/captain/scouting?' + new URLSearchParams({team:selected.id,tab,...extra}).toString();
    const controls = <><form method="get" className={styles.controls}>
      <input type="hidden" name="tab" value={tab}/>
      <label>Team<select name="team" defaultValue={selected.id}>{teams.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <button type="submit">View</button>
    </form><div className={styles.printEntry}><Link href={url({print:'1',tab:'players',sort:param(params,'sort')||'ci'})}>Print / PDF</Link></div><nav aria-label="Scouting sections" className={styles.tabs}>{['players','team','history'].map(t=><Link key={t} aria-current={tab===t?'page':undefined} href={url({tab:t})}>{t==='team'?'Teams':t[0].toUpperCase()+t.slice(1)}</Link>)}</nav></>;
    if (tab === 'players') {
      const current = season.id === active?.id;
      const published = await new SupabaseStatisticsRepository(db).getPublishedChallengeResults();
      const seasonResults = published.filter(r=>r.seasonId===season.id);
      const teamResults = seasonResults.filter(r=>r.homeTeamId===selected.id||r.awayTeamId===selected.id);
      const sideBySide = printable && own && own.id!==selected.id ? own : undefined;
      const [players, memberships] = await Promise.all([
        repository.getPlayers(),
        (db as any).from('launch_season_roster_memberships').select('player_id,roster_category,team_id').eq('season_id',season.id).in('team_id',sideBySide?[selected.id,sideBySide.id]:[selected.id]).eq('status','Active'),
      ]);
      if (memberships.error) throw memberships.error;
      const membershipRows = (memberships.data??[]) as {player_id:string;roster_category:string;team_id:string}[];
      const categories = new Map(membershipRows.filter(m=>m.team_id===selected.id).map(m=>[m.player_id,m.roster_category]));
      const ownCategories = new Map(membershipRows.filter(m=>m.team_id===sideBySide?.id).map(m=>[m.player_id,m.roster_category]));
      const historicalNames = new Map(teamResults.flatMap(r=>r.playerResults.filter(p=>p.teamId===selected.id).map(p=>[p.playerId,p.playerName] as const)));
      const roster = players.filter(p=>current?p.active&&categories.has(p.id):categories.has(p.id)||historicalNames.has(p.id));
      // Current ratings are not historical season ratings; hide them for past seasons.
      const ci = (p:typeof roster[number])=>current?p.clashIndex:null;
      const pdga = (p:typeof roster[number])=>current?p.pdgaRating:null;
      const ownHistoricalIds = new Set(seasonResults.flatMap(r=>r.playerResults.filter(p=>p.teamId===sideBySide?.id).map(p=>p.playerId)));
      const ownRoster = sideBySide ? players.filter(p=>current?p.active&&ownCategories.has(p.id):ownCategories.has(p.id)||ownHistoricalIds.has(p.id)) : [];
      const snapshot = await services.statistics.getPlayerSeasonStatisticsSnapshot([...new Set([...roster,...ownRoster].map(p=>p.id))],season.id);
      const stats = new Map(snapshot.statistics.map(s=>[s.playerId,s]));
      const sort = param(params,'sort') || 'ci';
      const score = (p: typeof roster[number]) => sort==='pdga' ? pdga(p) ?? -Infinity : sort==='change' ? snapshot.ciMovements.get(p.id)?.ciGain ?? -Infinity : sort==='singles' ? stats.get(p.id)?.singlesRecord.wins ?? 0 : sort==='doubles' ? stats.get(p.id)?.doublesRecord.wins ?? 0 : ci(p) ?? -Infinity;
      const rows = [...roster].sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name));
      if (printable && sideBySide) {
        const ownRows = [...ownRoster].sort((a,b)=>score(b)-score(a)||a.name.localeCompare(b.name));
        const generated = new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'}).format(new Date());
        const overview = await services.statistics.getMatchdayTeamStatisticsForTeams([sideBySide.id,selected.id],season.id,season.id);
        const teamRecord = (id:string) => record(overview.current.find(t=>t.teamId===id)?.record);
        const playerCells = (p:typeof roster[number]|undefined, cats:Map<string,string>) => {
          if (!p) return <><td/><td/><td/><td/><td/><td/><td/></>;
          const st=stats.get(p.id),delta=snapshot.ciMovements.get(p.id)?.ciGain;
          return <><td><span className={styles.printCheck} aria-label={'Mark off '+p.name}/></td><td className={styles.printName}>{p.name}{p.gender==='Female'?<sup className={styles.printMarker}> W</sup>:null}{cats.get(p.id)==='Junior'?<sup className={styles.printMarker}> J</sup>:null}</td><td>{ci(p)??'—'}{ci(p)!=null&&p.clashIndexProvisional?'*':''}</td><td>{pdga(p)??'—'}</td><td>{record(st?.singlesRecord)}</td><td>{record(st?.doublesRecord)}</td><td>{delta==null?'—':delta>0?'+'+delta:delta}</td></>;
        };
        return <div className={styles.printSheet}>
          <div className={styles.printToolbar}><Link href={url({tab:'players',sort})}>← Back to scouting</Link><PrintScoutingButton/></div>
          <header className={styles.printHeading}>
            <div><div className={styles.printKicker}>CAPE FEAR TEAM CLASH · CAPTAIN SCOUTING</div><h1>Match preparation worksheet</h1><p>{season.name} · As of {generated}</p></div>
          </header>
          <table className={`${styles.printTable} ${styles.dualPrintTable}`}>
            <colgroup>{['own','opponent'].flatMap(side=>[4,19,5,5,6,6,5].map((width,i)=><col key={side+i} style={{width:width+'%'}}/>))}</colgroup>
            <thead>
              <tr><th colSpan={7}><div className={styles.printTeam}>{logo(sideBySide.id,styles.printLogo)}<div><strong>{sideBySide.name}</strong><small>Your team · {ownRows.length} players · {teamRecord(sideBySide.id)}</small></div></div></th><th colSpan={7}><div className={styles.printTeam}>{logo(selected.id,styles.printLogo)}<div><strong>{selected.name}</strong><small>Opponent · {rows.length} players · {teamRecord(selected.id)}</small></div></div></th></tr>
              <tr>{['own','opponent'].flatMap(side=>['✓','Player','CI','PDGA','S','D','±'].map((label,i)=><th key={side+i}>{label}</th>))}</tr>
            </thead>
            <tbody>{Array.from({length:Math.max(ownRows.length,rows.length)},(_,i)=><tr key={i}>{playerCells(ownRows[i],ownCategories)}{playerCells(rows[i],categories)}</tr>)}</tbody>
          </table>
          <p className={styles.printLegend}>S = Singles · D = Doubles · W–L–T · ± = Season CI change · W = Woman · J = Junior · * = Provisional CI · — = Unavailable. Both lists are full season rosters, independently sorted, not proposed pairings. Mark boxes manually.</p>
          <div className={styles.printNotes}><strong>Match preparation notes</strong><div/><div/><div/></div>
          <footer className={styles.printFooter}>CCTeamClash.com · Captain reference · Published season statistics</footer>
        </div>;
      }
      if (printable) {
        const generated = new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'}).format(new Date());
        const summary = await services.statistics.getMatchdayTeamStatisticsForTeams([selected.id],season.id,season.id);
        const teamStats = summary.current.find(t=>t.teamId===selected.id);
        return <div className={styles.printSheet}>
          <div className={styles.printToolbar}><Link href={url({tab:'players',sort})}>← Back to scouting</Link><PrintScoutingButton/></div>
          <header className={styles.printHeading}>
            {logo(selected.id,styles.printLogo)}
            <div><div className={styles.printKicker}>CAPE FEAR TEAM CLASH · CAPTAIN SCOUTING</div><h1>{selected.name}</h1><p>{season.name} · {rows.length} roster players · As of {generated}</p></div>
          </header>
          <p className={styles.printSummary}>Season record: <strong>{record(teamStats?.record)}</strong> · Points: <strong>{teamStats?.matchesPlayed?number(teamStats.pointsPercentage)+'%':'—'}</strong> · {own && own.id!==selected.id?'Prepared for '+own.name:'Full roster reference'}</p>
          <table className={styles.printTable}>
            <colgroup><col style={{width:'32%'}}/><col style={{width:'9%'}}/><col style={{width:'9%'}}/><col style={{width:'12%'}}/><col style={{width:'12%'}}/><col style={{width:'8%'}}/><col style={{width:'18%'}}/></colgroup>
            <thead><tr><th>Player</th><th>CI</th><th>PDGA</th><th>Singles</th><th>Doubles</th><th>CI ±</th><th>Matchup notes</th></tr></thead>
            <tbody>{rows.map(p=>{const st=stats.get(p.id);const delta=snapshot.ciMovements.get(p.id)?.ciGain;return <tr key={p.id}><td>{p.name}{p.gender==='Female'?<sup className={styles.printMarker}> W</sup>:null}{categories.get(p.id)==='Junior'?<sup className={styles.printMarker}> J</sup>:null}</td><td>{ci(p)??'—'}{ci(p)!=null&&p.clashIndexProvisional?'*':''}</td><td>{pdga(p)??'—'}</td><td>{record(st?.singlesRecord)}</td><td>{record(st?.doublesRecord)}</td><td>{delta==null?'—':delta>0?'+'+delta:delta}</td><td></td></tr>})}</tbody>
          </table>
          {!rows.length&&<p>No roster players available.</p>}
          <p className={styles.printLegend}>W = Woman · J = Junior · * = Provisional CI · — = Unavailable · Records: W–L–T. Full season roster; attendance is not indicated.</p>
          <div className={styles.printNotes}><strong>Match preparation notes</strong><div/><div/></div>
          <footer className={styles.printFooter}>CCTeamClash.com · Captain reference · Published season statistics</footer>
        </div>;
      }
      const player = rows.find(p=>p.id===param(params,'player'));
      const history = player ? (await services.statistics.getPlayerMatchHistoriesForPlayers([player.id],100,season.id)).get(player.id) ?? [] : [];
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
      if (player) for (const r of seasonResults) for (const entry of r.playerResults.filter(p=>p.playerId===player.id&&p.format==='Doubles'&&p.contestId)) {
        const group=r.playerResults.filter(p=>p.contestId===entry.contestId);
        const partner=group.find(p=>p.teamId===entry.teamId&&p.playerId!==player.id);
        if (!partner||group.filter(p=>p.teamId!==entry.teamId).length<2) continue;
        const row=partners.get(partner.playerId)??{name:partner.playerName,wins:0,losses:0,ties:0};
        if(entry.outcome==='Win')row.wins++;else if(entry.outcome==='Loss')row.losses++;else row.ties++;
        partners.set(partner.playerId,row);
      }
      return <>{controls}<section className={styles.panel}><h2 className={styles.rosterHeading}>{logo(selected.id,styles.rosterLogo)}<span>{selected.name} · {current?'Season roster':'Recorded season players'}</span></h2><p>{current?'Tap a player to view their statistics.':'Historical roster coverage may be incomplete; current ratings are hidden.'}</p>
      <form method="get" className={styles.controls}><input type="hidden" name="tab" value="players"/><input type="hidden" name="team" value={selected.id}/>
      <label>Sort<select name="sort" defaultValue={sort}>{[['ci','Highest CI'],['pdga','Highest PDGA'],['singles','Singles wins'],['doubles','Doubles wins'],['change','CI gain']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><button type="submit">Apply</button></form>
      <div className={styles.playerCards} aria-label="Player scouting cards">
        {rows.map(p=>{
          const expanded=player?.id===p.id;
          const summary=stats.get(p.id);
          const change=snapshot.ciMovements.get(p.id)?.ciGain;
          const cardId='scouting-player-'+p.id;
          const detailId=cardId+'-detail';
          const href=url({player:expanded?'':p.id,sort});
          return <article key={p.id} id={cardId} className={`${styles.playerCard} ${expanded?styles.playerCardExpanded:''}`}>
            <Link className={styles.playerToggle} href={href} scroll={false} prefetch={false} aria-expanded={expanded} aria-controls={expanded?detailId:undefined}>
              <span className={styles.playerIdentity}><strong><PlayerName gender={p.gender}>{p.name}</PlayerName></strong>{categories.get(p.id)==='Junior'&&<small>Junior</small>}</span>
              <span className={styles.playerRating}><small>CI</small><strong>{ci(p)??'—'}{ci(p)!=null&&p.clashIndexProvisional?'*':''}</strong></span>
              <span className={styles.playerChevron} aria-hidden="true">{expanded?'⌃':'⌄'}</span>
            </Link>
            {expanded&&<section className={styles.playerDetails} id={detailId} aria-label={p.name+' statistics'}>
              <dl className={styles.playerMetrics}>
                <div className={styles.playerMetric}><dt>PDGA rating</dt><dd>{pdga(p)??'—'}</dd></div>
                <div className={styles.playerMetric}><dt>Season CI change</dt><dd>{change==null?'—':change>0?'+'+change:change}</dd></div>
                <div className={styles.playerMetric}><dt>Singles W–L–T</dt><dd>{record(summary?.singlesRecord)}</dd></div>
                <div className={styles.playerMetric}><dt>Doubles W–L–T</dt><dd>{record(summary?.doublesRecord)}</dd></div>
              </dl>
              <p>{summary?.matchesPlayed??0} matches played · Selected season{p.pdgaNumber&&<> · <a href={'https://www.pdga.com/player/'+encodeURIComponent(p.pdgaNumber)} target="_blank" rel="noreferrer">PDGA profile</a></>}</p>
              <h3>Published CI history</h3>{timeline.length?<table className={styles.table}><thead><tr><th>Match date</th><th>Before</th><th>After</th></tr></thead><tbody>{timeline.map(([id,p])=><tr key={id}><td>{p.date}</td><td>{p.before}</td><td>{p.after}</td></tr>)}</tbody></table>:<p>No verified rating snapshots available.</p>}<h3>Doubles partners · Selected season</h3>{partners.size?<table className={styles.table}><thead><tr><th>Partner</th><th>Played</th><th>W–L–T</th></tr></thead><tbody>{[...partners.entries()].sort((a,b)=>(b[1].wins+b[1].losses+b[1].ties)-(a[1].wins+a[1].losses+a[1].ties)).map(([id,p])=><tr key={id}><td>{p.name}</td><td>{p.wins+p.losses+p.ties}</td><td>{record(p)}</td></tr>)}</tbody></table>:<p>No recorded complete doubles partnerships.</p>}<h3>Contest history</h3>{history.length ? <table className={styles.table}><thead><tr><th>Date / Format</th><th>Opponents / Partner</th><th>Result</th></tr></thead><tbody>{history.map(h=><tr key={h.id}><td>{h.date}<br/>{h.format}</td><td>{h.opponentPlayerNames.join(', ')||'—'}{h.partnerPlayerNames.length>0&&<><br/><small>Partner: {h.partnerPlayerNames.join(', ')}</small></>}</td><td>{h.outcome}{facts.find(f=>f.match_id===h.challengeId&&h.id.startsWith(f.contest_id+':'))&&<><br/><small>Opp. CI: {number(facts.find(f=>f.match_id===h.challengeId&&h.id.startsWith(f.contest_id+':'))?.opponent_effective_ci)}</small></>}</td></tr>)}</tbody></table>:<p>No published contest history in this season.</p>}
            </section>}
          </article>;
        })}
      </div>
      {!rows.length&&<p>No matching roster players.</p>}<small>* Provisional CI. — Unavailable.</small></section></>;
    }
    const results = await new SupabaseStatisticsRepository(db).getPublishedChallengeResults();
    const relevant = results.filter(r=>r.seasonId===season.id&&(r.homeTeamId===selected.id||r.awayTeamId===selected.id)).sort((a,b)=>b.date.localeCompare(a.date));
    const names = new Map(teamsRaw.map(t=>[t.id,t.name]));
    const meetings = own && own.id!==selected.id ? results.filter(r=>[r.homeTeamId,r.awayTeamId].includes(own.id)&&[r.homeTeamId,r.awayTeamId].includes(selected.id)).sort((a,b)=>b.date.localeCompare(a.date)) : [];
    const roundLabels = new Map<string,string>();
    if (relevant.length) {
      const matchRows = await db.from('launch_schedule_matches').select('id,round_id').in('id',relevant.map(r=>r.challengeId));
      if (!matchRows.error && matchRows.data?.length) {
        const roundRows = await db.from('launch_rounds').select('id,number,name').in('id',[...new Set(matchRows.data.map(m=>m.round_id))]);
        if (!roundRows.error) {
          const labels = new Map((roundRows.data??[]).map(r=>[r.id,/playoff|final|championship|place/i.test(r.name)?r.name:'Round '+r.number]));
          for (const m of matchRows.data) {const label=labels.get(m.round_id);if(label)roundLabels.set(m.id,label);}
        }
      }
    }
    const resultTable = (items: typeof results) => items.length ? <table className={styles.table}><thead><tr><th>Round</th><th>Opponent</th><th>Score</th></tr></thead><tbody>{items.map(r=><tr key={r.id}><td><Link href={'/matches/'+r.challengeId}>{roundLabels.get(r.challengeId)??r.date}</Link></td><td><span className={styles.resultTeam}>{logo(r.homeTeamId===selected.id?r.awayTeamId:r.homeTeamId,styles.resultLogo)}<span>{names.get(r.homeTeamId===selected.id?r.awayTeamId:r.homeTeamId) ?? '—'}</span></span></td><td>{r.homeTeamId===selected.id?r.homeScore:r.awayScore}–{r.homeTeamId===selected.id?r.awayScore:r.homeScore}</td></tr>)}</tbody></table> : <p>No published results.</p>;
    if (tab==='history') {
      if (!own || own.id===selected.id) return <>{controls}<section className={styles.panel}><h2>{selected.name} · Current season</h2>{resultTable(relevant)}</section></>;
      // Historical team totals predate launch_match_results. Read the same public archive
      // used by Clash Challenge; do not create new match results or alter official scores.
      const archive = await (db as any).from('historical_team_matches')
        .select('id,season_name,event_order,event_label,played_on,home_team_name,away_team_name,home_score,away_score')
        .order('season_name',{ascending:false}).order('event_order',{ascending:false}).order('id',{ascending:false});
      type ArchiveMatch = {id:number;season_name:string;event_order:number;event_label:string|null;played_on:string|null;home_team_name:string;away_team_name:string;home_score:number|null;away_score:number|null};
      const aliases = new Map(teamsRaw.map(t=>[historicalClashTeamId(t.name),t.id]));
      const teamId = (name:string)=>aliases.get(historicalClashTeamId(name))??historicalClashTeamId(name);
      const seasonKey = (name:string)=>name.match(/20\d{2}[-–]20\d{2}/)?.[0].replace('–','-')??name;
      const seasonNames = new Map(seasonsRaw.map(s=>[s.id,s.name]));
      type Meeting = {id:string;season:string;date:string|null;event:string|null;order:number;homeId:string;awayId:string;homeScore:number;awayScore:number;href?:string};
      const historical:Meeting[] = ((archive.error?[]:archive.data??[]) as ArchiveMatch[]).flatMap(r=>{
        const homeId=teamId(r.home_team_name),awayId=teamId(r.away_team_name);
        if (![homeId,awayId].includes(own.id)||![homeId,awayId].includes(selected.id)||r.home_score==null||r.away_score==null) return [];
        return [{id:'archive-'+r.id,season:seasonKey(r.season_name),date:r.played_on,event:r.event_label,order:r.event_order,homeId,awayId,homeScore:Number(r.home_score),awayScore:Number(r.away_score)}];
      });
      const publishedMeetings:Meeting[]=meetings.map(r=>({id:'published-'+r.id,season:seasonKey(seasonNames.get(r.seasonId)??r.seasonId),date:r.date,event:null,order:0,homeId:r.homeTeamId,awayId:r.awayTeamId,homeScore:r.homeScore,awayScore:r.awayScore,href:'/matches/'+r.challengeId}));
      // Preserve distinct archive rounds. Only suppress an overlapping published copy
      // when season, sides, scores and any known dates agree.
      const merged=[...historical,...publishedMeetings.filter(r=>!historical.some(h=>h.season===r.season&&h.homeId===r.homeId&&h.awayId===r.awayId&&h.homeScore===r.homeScore&&h.awayScore===r.awayScore&&(!h.date||!r.date||h.date===r.date)))].sort((a,b)=>b.season.localeCompare(a.season)||(a.date&&b.date?b.date.localeCompare(a.date):b.order-a.order));
      return <>{controls}<section className={styles.panel}><h2>{own.name} vs {selected.name}</h2><p>Head-to-head · All recorded seasons</p>{archive.error&&<p>Historical archive temporarily unavailable; published results shown below.</p>}{merged.length?<table className={styles.table}><thead><tr><th>Match</th><th><span className={styles.comparisonTeam}>{logo(own.id,styles.comparisonLogo)}<span>{own.name}</span></span></th><th><span className={styles.comparisonTeam}>{logo(selected.id,styles.comparisonLogo)}<span>{selected.name}</span></span></th></tr></thead><tbody>{merged.map(r=>{const ownHome=r.homeId===own.id;const ownScore=ownHome?r.homeScore:r.awayScore;const opposingScore=ownHome?r.awayScore:r.homeScore;const label=r.date??r.event??r.season;return <tr key={r.id}><td>{r.href?<Link href={r.href}>{label}</Link>:label}<br/><small>{r.season} · {ownHome?'Home':'Away'}</small></td><td>{ownScore>opposingScore?<strong>{ownScore}</strong>:ownScore}</td><td>{opposingScore>ownScore?<strong>{opposingScore}</strong>:opposingScore}</td></tr>})}</tbody></table>:<p>No recorded head-to-head matches.</p>}</section></>;
    }
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
    return <>{controls}<section className={styles.panel}><h2>Team comparison</h2><p>Published results. Contest percentages award half credit for ties; team points include official adjustments.</p><table className={styles.table}><thead><tr><th>Statistic</th>{ids.map(id=><th key={id}><span className={styles.comparisonTeam}>{logo(id,styles.comparisonLogo)}<span>{names.get(id)}</span></span></th>)}</tr></thead><tbody>
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
