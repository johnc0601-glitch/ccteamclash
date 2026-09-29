import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {isMatchdayToday, findMatchdayIntro, MATCHDAY_INTROS, MATCHDAY_WELCOME_ART, selectIntroImage} from './matchdayIntro.config';

test('verified public slugs and legacy IDs resolve to the same matchup', () => {
  for (const [slug, art] of Object.entries(MATCHDAY_INTROS)) {
    assert.equal(findMatchdayIntro(`/matches/${slug}`)?.art, art);
    assert.equal(findMatchdayIntro(`/matches/${art.matchId}`)?.art, art);
  }
  assert.equal(findMatchdayIntro('/matches/kb-at-dark-knights-2026-r1')?.art.label, 'KB at Dark Knights');
});

test('unconfigured matches, deep links and unrelated destinations bypass intros', () => {
  for (const href of ['/schedule', '/matches/unknown', '/matches/%ZZ',
    '/matches/kb-at-dark-knights-2026-r1#post-1', '/matches/kb-at-dark-knights-2026-r1?edit=1']) {
    assert.equal(findMatchdayIntro(href), undefined);
  }
});

test('mobile crop is optional and desktop selection remains independent', () => {
  const art = {...Object.values(MATCHDAY_INTROS)[1], mobile: undefined};
  assert.equal(selectIntroImage(art, true), art.desktop);
  assert.equal(selectIntroImage({...art, mobile: '/crop.png'}, true), '/crop.png');
  assert.equal(selectIntroImage({...art, mobile: '/crop.png'}, false), art.desktop);
});

test('every configured welcome and matchup asset exists, with mobile art for all Round 1 matches', () => {
  for (const art of Object.values(MATCHDAY_INTROS)) {
    assert.ok(art.mobile, `${art.label} needs portrait artwork`);
    assert.ok(existsSync(`public${art.desktop}`), art.desktop);
    assert.ok(existsSync(`public${art.mobile}`), art.mobile);
  }
  for (const path of Object.values(MATCHDAY_WELCOME_ART)) assert.ok(existsSync(`public${path}`), path);
});

test('intro runs only on the scheduled Eastern calendar day', () => {
  for (const [instant, expected] of [
    ['2026-10-03T03:59:59Z', false], ['2026-10-03T04:00:00Z', true],
    ['2026-10-04T03:59:59Z', true], ['2026-10-04T04:00:00Z', false],
  ] as const) assert.equal(isMatchdayToday('2026-10-03', new Date(instant)), expected);
  assert.equal(isMatchdayToday('2027-01-02', new Date('2027-01-02T04:59:59Z')), false);
  assert.equal(isMatchdayToday('2027-01-02', new Date('2027-01-02T05:00:00Z')), true);
  for (const date of [undefined, null, '', 'TBD', '2026-10-04'])
    assert.equal(isMatchdayToday(date, new Date('2026-10-03T16:00:00Z')), false);
});
