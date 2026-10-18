import type {ResultContestInput} from '@/domain/results/MatchResult';

export type WhiteboardImportPlayer = {id: string; name: string; teamId: string; pdgaNumber?: string};
export type WhiteboardImportMatch = {
  id: string;
  date: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamName: string;
  awayTeamName: string;
};
export type WhiteboardPenalty = {
  round: number;
  against: 'Home' | 'Away';
  credited: 'Home' | 'Away';
  points: number;
  note: string;
};
export type WhiteboardAward = {
  side: 'Home' | 'Away';
  category: 'WomenBonus' | 'NoShow' | 'Penalty' | 'Other';
  points: number;
  note: string;
};
export type WhiteboardReview = {
  sourceMatchId: string;
  homeScore: number;
  awayScore: number;
  contests: ResultContestInput[];
  errors: string[];
  warnings: string[];
  aliasMatches: string[];
  penalties: WhiteboardPenalty[];
  awards: WhiteboardAward[];
  roundAdjustments: Array<{round: number; away: number; home: number}>;
};

type Dict = Record<string, unknown>;
const object = (x: unknown): Dict => x !== null && typeof x === 'object' && !Array.isArray(x) ? x as Dict : {};
const list = (x: unknown): unknown[] => Array.isArray(x) ? x : [];
const string = (x: unknown): string => typeof x === 'string' ? x.trim() : '';
const score = (x: unknown): number | null => typeof x === 'number' && Number.isFinite(x) && x >= 0 && Number.isInteger(x * 2) ? x : null;
const simplify = (x: string) => x.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
  .replace(/["“][^"”]*["”]/g, ' ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g, ' ');
const coreName = (x: string) => simplify(x).replace(/\b(jr|sr|ii|iii)\b/g, '').trim();
const approx = (a: number, b: number) => Math.abs(a-b)<0.001;

function identity(whiteboardName: string, pdgaNumber: number | null, side: 'Home'|'Away', teamId: string,
  candidates: readonly WhiteboardImportPlayer[], warnings: string[], errors: string[]): string {
  const teamPlayers = candidates.filter(p => p.teamId===teamId);
  const exactPdga = pdgaNumber ? teamPlayers.filter(p => p.pdgaNumber && Number(p.pdgaNumber) === pdgaNumber) : [];
  let matches = exactPdga;
  if (matches.length===0) {
    matches = teamPlayers.filter(p => simplify(p.name)===simplify(whiteboardName)
      || coreName(p.name)===coreName(whiteboardName));
  }
  if (matches.length===0) {
    const parts=coreName(whiteboardName).split(' ');
    const first=parts[0]||'', surname=parts[parts.length-1]||'';
    matches=teamPlayers.filter(p=>{
      const candidate=coreName(p.name).split(' ');
      const candidateSurname=candidate[candidate.length-1] || '';
      const surnameMatches=surname.length===1
        ? candidateSurname.startsWith(surname) : candidateSurname===surname;
      return surnameMatches && first.length>0
        && candidate[0]?.[0]===first[0];
    });
  }
  if (matches.length!==1) {
    errors.push((matches.length ? 'Ambiguous' : 'Unmatched') + ' ' + side + ' player: ' + whiteboardName);
    return '';
  }
  const winner=matches[0];
  if (simplify(whiteboardName)!==simplify(winner.name) && coreName(whiteboardName)!==coreName(winner.name)) {
    warnings.push('Name alias: ' + whiteboardName + ' → ' + winner.name);
  }
  return winner.id;
}

/**
 * Read-only adaptation of tcwhiteboard.match/v1 to the existing commissioner
 * Results editor. Does not persist, publish, adjust scores or modify CI.
 *
 * Special 1v1 matches played during the doubles round are Singles contests
 * because the website's result model determines CI from contest format.
 * Missing/bonus team points are reported for review, never assigned a reason.
 */
export function prepareWhiteboardImport(
  payload: unknown,
  expected: WhiteboardImportMatch,
  candidates: readonly WhiteboardImportPlayer[],
): WhiteboardReview {
  const errors: string[] = [], warnings: string[] = [], aliasMatches: string[] = [];
  const source=object(payload), match=object(source.match);
  const home=object(match.home), away=object(match.away);
  const sourceMatchId=string(match.id);
  if(source.schema!=='tcwhiteboard.match/v1') errors.push('Not a supported TC Whiteboard match/v1 results file.');
  if (string(match.status).toLowerCase()!=='final') errors.push('TC Whiteboard match is not finalized.');
  if (!sourceMatchId) errors.push('TC Whiteboard match ID is missing.');
  if (!expected.homeTeamId || !expected.awayTeamId) errors.push('Select a scheduled match with both assigned teams.');
  if (string(match.date)!==expected.date) errors.push('File date does not match the selected website match.');
  const homeName=string(home.name),awayName=string(away.name);
  if (simplify(homeName)!==simplify(expected.homeTeamName) ||
      simplify(awayName)!==simplify(expected.awayTeamName)) {
    errors.push('Home/away teams do not match this website match; check selection.');
  }
  const officialHome=score(home.points), officialAway=score(away.points);
  if (officialHome===null || officialAway===null) errors.push('Official final totals must be valid half-point scores.');

  const rounds=list(source.rounds);
  if (rounds.length!==2) errors.push('Expected both completed singles and doubles rounds.');
  const contests: ResultContestInput[]=[];
  const penalties: WhiteboardPenalty[]=[];
  const awards: WhiteboardAward[]=[];
  const roundAdjustments: WhiteboardReview['roundAdjustments']=[];
  let nextSingles=1, nextDoubles=1, summedHome=0, summedAway=0;
  const knownPlayers=new Map<string,{side:'Home'|'Away';format:string}>();

  for(const [roundIndex, roundRaw] of rounds.entries()){
    const round=object(roundRaw), title=string(round.name).toLowerCase();
    const currentFormat=title==='singles'?'Singles':title==='doubles'?'Doubles':null;
    if(!currentFormat){errors.push('Unknown round format: '+string(round.name));continue;}
    const reported=object(round.points), reportedAway=score(reported.away),reportedHome=score(reported.home);
    if(reportedAway===null || reportedHome===null){errors.push('Round '+(roundIndex+1)+' has invalid totals.');continue;}
    let playedAway=0,playedHome=0;
    const matchups=list(round.matchups);
    if (!matchups.length) errors.push('Round '+(roundIndex+1)+' has no matchups.');
    for(const [index,matchupRaw] of matchups.entries()){
      const matchup=object(matchupRaw), h=object(matchup.home),a=object(matchup.away), result=object(matchup.result);
      const homePlayers=list(h.players).map(object), awayPlayers=list(a.players).map(object);
      const pHome=score(h.points),pAway=score(a.points);
      if(pHome===null||pAway===null){errors.push('Invalid points in round '+(roundIndex+1)+' card '+(index+1));continue;}
      playedHome+=pHome;playedAway+=pAway;
      const oneOnOne=homePlayers.length===1 && awayPlayers.length===1;
      const twoOnTwo=homePlayers.length===2 && awayPlayers.length===2;
      if((currentFormat==='Singles' && !oneOnOne) || (currentFormat==='Doubles' && !oneOnOne && !twoOnTwo)){
        errors.push('Unsupported player count in round '+(roundIndex+1)+' card '+(index+1));
        continue;
      }
      if(result.forfeitedBy!==null&&result.forfeitedBy!==undefined){
        errors.push('Forfeit requires manual review in round '+(roundIndex+1)+' card '+(index+1));
        continue;
      }
      const format=oneOnOne?'Singles':'Doubles';
      const maxPoints=format==='Singles'?1:2;
      if(!approx(pHome+pAway,maxPoints)){
        errors.push('Unexpected contest point total in round '+(roundIndex+1)+' card '+(index+1));
        continue;
      }
      const winner=string(result.winner);
      if(!['home','away',''].includes(winner)){errors.push('Invalid winner in round '+(roundIndex+1)+' card '+(index+1));continue;}
      if ((winner==='home' && pHome<=pAway) || (winner==='away'&&pAway<=pHome)
        || (winner===''&&!approx(pHome,pAway))){
        errors.push('Winner/points disagreement in round '+(roundIndex+1)+' card '+(index+1));
        continue;
      }
      if(currentFormat==='Doubles'&&oneOnOne)
        warnings.push('Round 2 card '+(index+1)+' is 1v1. Imported as Singles for player W/L and CI.');
      const pos=format==='Singles'?nextSingles++:nextDoubles++;
      const id=expected.id+'-tcwhiteboard-'+format.toLowerCase()+'-'+pos;
      const players: ResultContestInput['players'] = [];
      for(const [side, sourcePlayers, teamId] of [
        ['Home',homePlayers,expected.homeTeamId],
        ['Away',awayPlayers,expected.awayTeamId],
      ] as const){
        for(const [slot, sourcePlayer] of sourcePlayers.entries()){
          const name=string(sourcePlayer.name);
          if(!name){errors.push('Missing player name in round '+(roundIndex+1)+' card '+(index+1));continue;}
          const number=sourcePlayer.pdgaNumber;
          const pdga=typeof number==='number'&&Number.isInteger(number)?number:null;
          const previousCount=warnings.length;
          const resolvedId=identity(name,pdga,side,teamId||'',candidates,warnings,errors);
          if(warnings.length>previousCount) aliasMatches.push(warnings[warnings.length-1]);
          if(!resolvedId)continue;
          // A player may legitimately take singles in both rounds when a
          // special 1v1 is used during the doubles round.
          const encounterKey=side+'|round-'+roundIndex+'|'+resolvedId;
          if(knownPlayers.has(encounterKey)){
            errors.push('Player repeated in '+format+': '+name);
          }
          knownPlayers.set(encounterKey,{side,format});
          players.push({playerId:resolvedId,teamId:teamId||'',side,slot:(slot+1) as 1|2});
        }
      }
      contests.push({
        id,format,position:pos,
        homeOutcome:winner==='home'?'W':winner==='away'?'L':'T',
        awayOutcome:winner==='away'?'W':winner==='home'?'L':'T',
        homeScore:null,awayScore:null,players,
      });
    }
    summedHome+=reportedHome;summedAway+=reportedAway;
    const diffAway=reportedAway-playedAway,diffHome=reportedHome-playedHome;
    // TC Whiteboard v1 exports now include round.penalties. For new
    // exports, these entries MUST reconcile exactly with team-only points.
    // Earlier files without the field remain in manual-review mode.
    const penaltyFieldPresent = Object.prototype.hasOwnProperty.call(round,'penalties');
    if(penaltyFieldPresent && !Array.isArray(round.penalties)){
      errors.push('Round '+(roundIndex+1)+' penalties must be an array.');
    }
    let documentedAway=0,documentedHome=0;
    for(const [penaltyIndex, raw] of (Array.isArray(round.penalties) ? round.penalties : []).entries()){
      const penalty=object(raw),against=string(penalty.against).toLowerCase();
      const amount=score(penalty.points), note=string(penalty.note);
      const expectedTeam=against==='home'?string(home.id):against==='away'?string(away.id):'';
      if(!expectedTeam || string(penalty.teamId)!==expectedTeam || amount===null || amount<=0 || !note){
        errors.push('Round '+(roundIndex+1)+' penalty '+(penaltyIndex+1)+' has invalid team, amount or explanation.');
        continue;
      }
      const credited: 'Home'|'Away' = against==='home'?'Away':'Home';
      const penaltyRecord: WhiteboardPenalty = {
        round:roundIndex+1, against:against==='home'?'Home':'Away', credited,
        points:amount, note,
      };
      penalties.push(penaltyRecord);
      if(credited==='Away')documentedAway+=amount;else documentedHome+=amount;
      // Categorization here is intentionally limited to known, exact 2026-27
      // rule descriptions. Preserve the full original note for review.
      // If an exporter changes its language, default to Other rather than
      // silently manufacturing a women's or no-show penalty.
      const n=note.toLowerCase().replace(/\s+/g,' ').trim();
      if(n==='short female' && approx(amount,1)){
        awards.push({side:credited, category:'WomenBonus',points:1,note:'Round '+(roundIndex+1)+': '+note});
      } else if(n==='missing female and rostered player' && approx(amount,1.5)){
        awards.push({side:credited, category:'WomenBonus',points:1,note:'Round '+(roundIndex+1)+': '+note+' (missing female portion)'});
        awards.push({side:credited, category:'NoShow',points:0.5,note:'Round '+(roundIndex+1)+': '+note+' (rostered-player no-show portion; commissioner confirmation required)'});
        warnings.push('Round '+(roundIndex+1)+' 1.5 points split by current league rules as missing female +1 and rostered no-show +0.5. Confirm before saving.');
      } else {
        awards.push({side:credited,category:'Other',points:amount,note:'Round '+(roundIndex+1)+': '+note});
        warnings.push('Round '+(roundIndex+1)+' penalty '+JSON.stringify(note)+' is unclassified; commissioner must verify its category.');
      }
    }
    if(penaltyFieldPresent && (!approx(documentedAway,diffAway) || !approx(documentedHome,diffHome))){
      errors.push('Round '+(roundIndex+1)+' penalty ledger does not match team points outside matchups.');
    }
    if(diffAway<-.001||diffHome<-.001) errors.push('Round '+(roundIndex+1)+' reported fewer points than its matchups.');
    if(!Number.isInteger(diffAway*2)||!Number.isInteger(diffHome*2))
      errors.push('Round '+(roundIndex+1)+' adjustment is not a half-point increment.');
    if(!penaltyFieldPresent && (diffAway>0||diffHome>0))
      warnings.push('Round '+(roundIndex+1)+' contains unattributed team points: Away +'+diffAway+', Home +'+diffHome+'. Older export has no penalty ledger; commissioner must supply the reason.');
    roundAdjustments.push({round:roundIndex+1,away:diffAway,home:diffHome});
  }
  if(officialHome!==null&&!approx(summedHome,officialHome)) errors.push('Rounds do not sum to official home final.');
  if(officialAway!==null&&!approx(summedAway,officialAway)) errors.push('Rounds do not sum to official away final.');
  if(contests.length===0)errors.push('No supported played matchups.');
  return {sourceMatchId,homeScore:officialHome??0,awayScore:officialAway??0,
    contests,errors,warnings,aliasMatches,penalties,awards,roundAdjustments};
}

// Both imported and previously-saved administrative points are authoritative
// only when they reconcile exactly to the unplayed-contest difference.
// Never discard a category from a multi-row ledger on editor reload.
export function structuralAwardsCoverResiduals(
  rows: readonly {awardedTeamId: string; points: number}[],
  homeTeamId: string | null,
  awayTeamId: string | null,
  homeResidual: number,
  awayResidual: number,
): boolean {
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return false;
  if (![homeResidual, awayResidual].every(Number.isFinite)) return false;
  if (homeResidual < -0.001 || awayResidual < -0.001) return false;
  let home = 0, away = 0;
  for (const row of rows) {
    if (!Number.isFinite(row.points) || row.points <= 0 || !Number.isInteger(row.points * 2)) return false;
    if (row.awardedTeamId === homeTeamId) home += row.points;
    else if (row.awardedTeamId === awayTeamId) away += row.points;
    else return false;
  }
  return Math.abs(home - homeResidual) < 0.001
    && Math.abs(away - awayResidual) < 0.001;
}
