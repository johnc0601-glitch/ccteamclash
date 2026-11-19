import type {SpreadVoteChoice} from './SpreadVote';

export type ChallengeOutcome='correct'|'incorrect'|'push'|'pending'|'no-pick'|'not-offered';
export type ChallengeRoundState='active'|'past'|'future';
export type ChallengeRecord={correct:number;incorrect:number;pushes:number};

export type ChallengeRoundOption={
  number:number;
  date:string;
  state:ChallengeRoundState;
};

export type ChallengeHistoryMatch={
  matchId:string;
  homeName:string;
  awayName:string;
  homeLogo:string;
  awayLogo:string;
  date:string;
  time:string;
  matchHref:string;
  homeLine:number|null;
  homeScore:number|null;
  awayScore:number|null;
  myChoice:SpreadVoteChoice|null;
  selectedTeamName:string|null;
  outcome:ChallengeOutcome;
};

export type ClashChallengeSeason={
  rounds:ChallengeRoundOption[];
  selectedRound:number|null;
  activeRound:number|null;
  selectedState:ChallengeRoundState|null;
  matches:ChallengeHistoryMatch[];
  roundRecord:ChallengeRecord;
  seasonRecord:ChallengeRecord;
};

export function emptyChallengeRecord():ChallengeRecord{
  return {correct:0,incorrect:0,pushes:0};
}

/**
 * Choice low means the projected favorite outperforms; high means its opponent
 * outperforms. A push cannot be counted as a correct pick by either team.
 * The accepted frozen HOME projection is signed, including away favorites.
 */
export function evaluateClashChoice(
  choice:SpreadVoteChoice|null,homeLine:number|null,
  homeScore:number|null,awayScore:number|null,
):ChallengeOutcome{
  if(!choice)return 'no-pick';
  if(homeScore==null||awayScore==null||homeLine==null||homeLine===0)return 'pending';
  const projectedFavoriteMargin=Math.abs(homeLine);
  const actualFavoriteMargin=(homeScore-awayScore)*Math.sign(homeLine);
  // Both league scores and the frozen projection use half-point precision.
  const difference=Math.round((actualFavoriteMargin-projectedFavoriteMargin)*2);
  if(difference===0)return 'push';
  return (difference>0)===(choice==='low')?'correct':'incorrect';
}

export function selectedChallengeTeam(
  choice:SpreadVoteChoice|null,homeLine:number|null,
  homeName:string,awayName:string,
):string|null{
  if(!choice||homeLine==null||homeLine===0)return null;
  const favorite=homeLine>0?homeName:awayName;
  const underdog=homeLine>0?awayName:homeName;
  return choice==='low'?favorite:underdog;
}

export function countChallengeRecord(outcomes:ChallengeOutcome[]):ChallengeRecord{
  const record=emptyChallengeRecord();
  for(const outcome of outcomes){
    if(outcome==='correct')record.correct++;
    else if(outcome==='incorrect')record.incorrect++;
    else if(outcome==='push')record.pushes++;
  }
  return record;
}

/** Default to the currently available round; otherwise the next round or latest finished one. */
export function chooseChallengeRound(
  rounds:ChallengeRoundOption[],requested:number|null,
):number|null{
  if(requested!=null&&rounds.some(round=>round.number===requested))return requested;
  return rounds.find(round=>round.state==='active')?.number
    ??rounds.find(round=>round.state==='future')?.number
    ??rounds.at(-1)?.number??null;
}

/** Only rounds with actual Challenge matchups belong in completed game history. */
export function chooseChallengeAvailableRounds(
  rounds:ChallengeRoundOption[],
  offeredRoundNumbers:ReadonlySet<number>,
):ChallengeRoundOption[]{
  return rounds.filter(round=>round.state!=='past'||offeredRoundNumbers.has(round.number));
}

/** Do not show regular league matches that were never part of this game. */
export function isChallengeRoundMatchListed(
  state:ChallengeRoundState,
  hadChallengeProjectionOrPick:boolean,
  isStillPlayable:boolean,
):boolean{
  return state==='future'||hadChallengeProjectionOrPick||(state==='active'&&isStillPlayable);
}
