import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClashChallengeInsights,historicalClashTeamId,isFullLengthClashMatch,
  type CompletedClashMatch,
} from './ClashChallengeInsights';

const game=(changes:Partial<CompletedClashMatch>={}):CompletedClashMatch=>({
  homeTeamId:'cougar-country',awayTeamId:'wild-turkey',
  homeTeamName:'Cougar Country',awayTeamName:'Wild Turkey',
  homeScore:22.5,awayScore:13.5,seasonName:'2026-2027',
  playedOn:'2026-10-03',isFullLength:true,isCurrentSeason:true,
  ...changes,
});

test('historical team aliases and postseason identification',()=>{
  assert.equal(historicalClashTeamId("Hayneous OG's"),'hayneous-og-s');
  assert.equal(historicalClashTeamId('KB'),'kb');
  assert.equal(isFullLengthClashMatch('March Championship'),false);
  assert.equal(isFullLengthClashMatch('April Semifinal 2'),false);
  assert.equal(isFullLengthClashMatch('March 3rd Place'),false);
  assert.equal(isFullLengthClashMatch('November'),true);
});

test('side-by-side home and away form excludes shortened games but head-to-head retains them',()=>{
  const completed:CompletedClashMatch[]=[
    game({
      homeTeamId:'ninjas',awayTeamId:'cougar-country',
      homeTeamName:'Ninjas',awayTeamName:'Cougar Country',
      homeScore:20,awayScore:16,seasonName:'2025-2026',
      eventLabel:'November',isCurrentSeason:false,playedOn:undefined,
    }),
    game({
      homeTeamId:'cougar-country',awayTeamId:'ninjas',
      homeScore:10,awayScore:7,awayTeamName:'Ninjas',
      seasonName:'2025-2026',eventLabel:'March Semifinal 2',
      isCurrentSeason:false,isFullLength:false,playedOn:undefined,
    }),
    game(),
    game({
      homeTeamId:'ninjas',awayTeamId:'hayneous-og-s',
      homeTeamName:'Ninjas',awayTeamName:"Hayneous OG's",
      homeScore:30,awayScore:7.5,
    }),
    game({
      homeTeamId:'hayneous-og-s',awayTeamId:'cougar-country',
      homeTeamName:"Hayneous OG's",awayTeamName:'Cougar Country',
      homeScore:19.5,awayScore:18.5,playedOn:'2026-11-07',
    }),
    game({
      homeTeamId:'kb',awayTeamId:'ninjas',
      homeTeamName:'KB',awayTeamName:'Ninjas',
      homeScore:22,awayScore:14,playedOn:'2026-11-07',
    }),
  ];
  const stats=buildClashChallengeInsights(completed,'cougar-country','ninjas');
  assert.equal(stats.home.played,1);
  assert.equal(stats.home.wins,1);
  assert.equal(stats.home.averageVictoryMargin,9);
  assert.equal(stats.home.averageDefeatMargin,null);
  assert.equal(stats.away.played,1);
  assert.equal(stats.away.losses,1);
  assert.equal(stats.away.averageDefeatMargin,8);
  assert.equal(stats.homeSeason.wins,1);
  assert.equal(stats.homeSeason.losses,1);
  assert.deepEqual(stats.homeSeason.results.map(result=>[result.venue,result.opponent,result.result,result.scoreFor,result.scoreAgainst]),[
    ['home','Wild Turkey','W',22.5,13.5],
    ['away',"Hayneous OG's",'L',18.5,19.5],
  ]);
  assert.equal(stats.awaySeason.wins,1);
  assert.equal(stats.awaySeason.losses,1);
  assert.equal(stats.previousMeeting?.eventLabel,'March Semifinal 2');
});

test('empty team history shows no prior match or average; ties are not counted as wins',()=>{
  const stats=buildClashChallengeInsights([game({
    homeScore:18,awayScore:18,awayTeamId:'beast-mode',awayTeamName:'Beast Mode',
  })],'cougar-country','ninjas');
  assert.equal(stats.home.wins,0);
  assert.equal(stats.home.ties,1);
  assert.equal(stats.home.averageVictoryMargin,null);
  assert.equal(stats.away.played,0);
  assert.equal(stats.previousMeeting,null);
  assert.equal(stats.homeSeason.ties,1);
});
