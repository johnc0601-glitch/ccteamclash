import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {findMatchdayIntro, MATCHDAY_INTROS, MATCHDAY_WELCOME_ART, selectIntroImage} from './matchdayIntro.config';

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
