import assert from 'node:assert/strict';
import test from 'node:test';
import type {PulseSource, PulseRating} from './PulseFacts';
import {generateAcrossSeasonStreakFacts, type ArchivedStreakSource} from './PulseHistoricalStreaks';

function fixture() {
  const r1 = {id:'r1',season_id:'coastal-clash-2026-2027',number:1,name:'Round 1',date:'2026-10-03'};
  const r2 = {...r1,id:'r2',number:2,date:'2026-11-07'};
  const source: PulseSource = {
    seasons:[{id:r1.season_id,name:'Coastal Clash 2026-2027',active:true}],
    rounds:[r1,r2],
    matches:[
      {id:'live1',season_id:r1.season_id,round_id:r1.id,date:'2026-10-03',
        home_team_id:'a',away_team_id:'b',home_name:'Alpha',away_name:'Bravo'},
      {id:'live2',season_id:r1.season_id,round_id:r1.id,date:'2026-10-03',
        home_team_id:'c',away_team_id:'d',home_name:'Charlie',away_name:'Delta'},
      {id:'future',season_id:r1.season_id,round_id:r2.id,date:'2026-11-07',
        home_team_id:'a',away_team_id:'b',home_name:'Alpha',away_name:'Bravo'},
    ],
    results:[{match_id:'live1',status:'Published',home_score:14,away_score:7},
      {match_id:'live2',status:'Published',home_score:11,away_score:9}],
    ratings:[], snapshots:[], adjustments:[], predictions:[], history:[],
  };
  const teams: ArchivedStreakSource['teams'] = [
    {id:1,season_name:'2025-2026',event_order:5,event_label:'February',home_team_name:'Alpha',away_team_name:'Delta',home_score:19,away_score:10},
    {id:2,season_name:'2025-2026',event_order:6,event_label:'Semifinal',home_team_name:'Alpha',away_team_name:'Delta',home_score:15,away_score:8},
    {id:3,season_name:'2025-2026',event_order:5,event_label:'February',home_team_name:'Bravo',away_team_name:'Charlie',home_score:18,away_score:12},
    {id:4,season_name:'2025-2026',event_order:6,event_label:'Semifinal',home_team_name:'Bravo',away_team_name:'Charlie',home_score:18,away_score:12},
    {id:5,season_name:'2025-2026',event_order:7,event_label:'Final',home_team_name:'Charlie',away_team_name:'Delta',home_score:null,away_score:null},
  ];
  const player = (pid:string,name:string,teamMatch:number,format:'Singles'|'Doubles',outcome:'W'|'L'|'T') => ({
    deduplication_key:`archived:${teamMatch}:${pid}:${format}`,
    season_id:'coastal-clash-2025-2026',event_order:teams.find(t=>t.id===teamMatch)!.event_order,
    historical_team_match_id:teamMatch,player_id:pid,player_name:name,
    player_team_name:'Alpha',match_format:format,outcome,
    opponent_one_player_name:'Opponent',opponent_two_player_name:null,
  });
  const archive: ArchivedStreakSource = {teams,players:[
    player('p','Player P',1,'Singles','W'), player('p','Player P',2,'Singles','W'),
    player('q','Player Q',3,'Singles','W'), player('q','Player Q',4,'Singles','W'),
    player('r','Player R',5,'Doubles','W'),
  ]};
  const rated = (pid:string,name:string,format:'Singles'|'Doubles',matchId:string,outcome:'W'|'L'):PulseRating => ({
    contest_id:`contest:${pid}`,match_id:matchId,player_id:pid,player_name:name,
    team_id:pid==='q'?'b':pid==='r'?'c':'a',team_name:pid==='q'?'Bravo':pid==='r'?'Charlie':'Alpha',
    side:pid==='q'?'Away':'Home',format,outcome,win_probability:.5,ci_delta:0,clash_index_before:850,
  });
  const verified: PulseRating[]=[
    rated('p','Player P','Singles','live1','W'),
    rated('q','Player Q','Singles','live1','L'),
    rated('r','Player R','Doubles','live2','W'),
  ];
  return {source,round:r1,archive,verified,player};
}
test('ongoing and broken streaks carry over across seasons with separate team and player records',()=>{
  const {source,round,archive,verified}=fixture();
  const facts=generateAcrossSeasonStreakFacts(source,round,verified,archive);
  assert.ok(facts.some(f=>f.category==='Streaks' && f.fact_text.includes('Alpha:') && f.fact_text.includes('3-match winning')));
  assert.ok(facts.some(f=>f.category==='Broken streaks' && f.fact_text.includes('Bravo:') && f.fact_text.includes('2-match winning')));
  assert.ok(facts.some(f=>f.category==='Streaks' && f.fact_text.includes('Player P (singles)') && f.fact_text.includes('3-appearance winning')));
  assert.ok(facts.some(f=>f.category==='Broken streaks' && f.fact_text.includes('Player Q (singles)') && f.fact_text.includes('2-appearance winning')));
  assert.ok(!facts.some(f=>f.fact_text.includes('Round 2')));
});
test('archived player outcome with unknown team score can count, but unknown team result cannot',()=>{
  const {source,round,archive,verified}=fixture();
  const facts=generateAcrossSeasonStreakFacts(source,round,verified,archive);
  assert.ok(facts.some(f=>f.fact_text.includes('Player R (doubles)') && f.fact_text.includes('2-appearance winning')));
  assert.ok(!facts.some(f=>f.fact_text.includes('Charlie:') && f.fact_text.includes('winning streak')));
});
test('ambiguous duplicate same-format archived appearance is a barrier',()=>{
  const {source,round,archive,verified}=fixture();
  archive.players.push({...archive.players[1],deduplication_key:'additional-play',outcome:'L'});
  const facts=generateAcrossSeasonStreakFacts(source,round,verified,archive);
  assert.ok(!facts.some(f=>f.fact_text.includes('Player P (singles)')));
});
test('a tie breaks a winning streak and continues an unbeaten run',()=>{
  const {source,round,archive,verified}=fixture();
  source.results[0].home_score=7;
  source.results[0].away_score=7;
  const facts=generateAcrossSeasonStreakFacts(source,round,verified,archive);
  assert.ok(facts.some(f=>f.category==='Broken streaks' && f.fact_text.includes('Alpha:') && f.fact_text.includes('winning streak ended with a tie')));
  assert.ok(facts.some(f=>f.category==='Streaks' && f.fact_text.includes('Alpha:') && f.fact_text.includes('unbeaten streak')));
});
test('archived years after the current scope cannot inflate streaks',()=>{
  const {source,round,archive,verified}=fixture();
  archive.teams[0].season_name='2027-2028';
  archive.teams[1].season_name='2027-2028';
  const facts=generateAcrossSeasonStreakFacts(source,round,verified,archive);
  assert.ok(!facts.some(f=>f.fact_text.includes('Alpha:') && f.fact_text.includes('3-match')));
});
