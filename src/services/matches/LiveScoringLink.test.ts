import assert from 'node:assert/strict';
import test from 'node:test';
import {getLiveScoringHref} from './LiveScoringLink';

const beastAtRiptide = {
  id: 'beast-mode-vs-riptide-3ed22cf9-623e-4c11-96a2-b0e6c42b7e0d',
  scheduledDate: '2026-10-17',
  awayTeamId: 'beast-mode',
  homeTeamId: 'riptide',
};

test('shows the verified TC Whiteboard feed on matchday before final publication', () => {
  assert.equal(getLiveScoringHref(beastAtRiptide, {today: '2026-10-17', hasPublishedResult: false}),
    'https://tcwhiteboard.com/l/cctc/matches/f4m09qxvri1hredzcoafzbst/live');
});

test('hides the LIVE! link outside the match date', () => {
  assert.equal(getLiveScoringHref(beastAtRiptide, {today: '2026-10-16', hasPublishedResult: false}), undefined);
  assert.equal(getLiveScoringHref(beastAtRiptide, {today: '2026-10-18', hasPublishedResult: false}), undefined);
});

test('hides LIVE! as soon as final results are published', () => {
  assert.equal(getLiveScoringHref(beastAtRiptide, {today: '2026-10-17', hasPublishedResult: true}), undefined);
});

test('refuses an incorrect matchup, swapped home and away, or moved date', () => {
  const options = {today: '2026-10-17', hasPublishedResult: false};
  assert.equal(getLiveScoringHref({...beastAtRiptide, id: 'another-match'}, options), undefined);
  assert.equal(getLiveScoringHref({...beastAtRiptide, homeTeamId: 'beast-mode', awayTeamId: 'riptide'}, options), undefined);
  assert.equal(getLiveScoringHref({...beastAtRiptide, scheduledDate: '2026-10-24'}, {...options, today: '2026-10-24'}), undefined);
});

const upcomingFeeds = [
  {id: 'beast-mode-vs-cougar-country-04c36978-4b61-48b4-b08f-faf455e6bc9c', scheduledDate: '2026-11-07', awayTeamId: 'ninjas', homeTeamId: 'kb', tcId: 'yaiwkus9dh41arzwgwvy0oha'},
  {id: 'dark-knights-vs-kb-159e3a72-7e0b-49c3-8cdb-f65500a11261', scheduledDate: '2026-11-07', awayTeamId: 'beast-mode', homeTeamId: 'dark-knights', tcId: 'v0hqpkvbxztjdz2u6yotr3qy'},
  {id: 'hayneous-og-s-vs-wild-turkey-e6516e83-cb71-4c97-b449-a4597d8067e8', scheduledDate: '2026-11-07', awayTeamId: 'cougar-country', homeTeamId: 'hayneous-og-s', tcId: 'g3wseyq1jmf2hu886ox8j9za'},
  {id: 'hayneous-og-s-vs-kb-c5640100-8456-4675-abf9-4729e5a03800', scheduledDate: '2026-12-05', awayTeamId: 'hayneous-og-s', homeTeamId: 'beast-mode', tcId: 'c6igh6wv187xeooduhoad8rv'},
  {id: 'wild-turkey-vs-beast-mode-fc304831-bb4f-4eb3-bd60-b171254f6b4c', scheduledDate: '2026-12-05', awayTeamId: 'dark-knights', homeTeamId: 'wild-turkey', tcId: 't1hk4f5ephmzhj9ofud8ki2a'},
  {id: 'cougar-country-vs-ninjas-02310df6-b95f-4265-9c69-3adc05c80a55', scheduledDate: '2026-12-05', awayTeamId: 'ninjas', homeTeamId: 'cougar-country', tcId: 'e4es0fohg98b7jdlltgwoi0c'},
  {id: 'riptide-vs-dark-knights-8aece64a-6f97-493b-9262-dd8f41e4bd94', scheduledDate: '2026-12-05', awayTeamId: 'riptide', homeTeamId: 'kb', tcId: 'z0dhgijnr96ts2evsed4y57a'},
  {id: 'cougar-country-vs-dark-knights-fc1e1e6d-13ca-4ce7-93af-eb74471df40b', scheduledDate: '2027-01-02', awayTeamId: 'beast-mode', homeTeamId: 'ninjas', tcId: 'te4eqkfa6p6n35n4un5kxqvj'},
  {id: 'kb-vs-riptide-fd88ace5-299d-4f45-81f1-22b364feee4f', scheduledDate: '2027-01-02', awayTeamId: 'cougar-country', homeTeamId: 'kb', tcId: 'uhkb7wvsvsd1qdl8kgigw9q1'},
] as const;

test('upcoming CCTC matches use their matching TC Whiteboard live-scoring links on their exact dates', () => {
  for (const {tcId, ...match} of upcomingFeeds) {
    const href = getLiveScoringHref(match, {today: match.scheduledDate, hasPublishedResult: false});
    assert.equal(href, `https://tcwhiteboard.com/l/cctc/matches/${tcId}/live`, match.id);
    assert.equal(getLiveScoringHref(match, {today: '2026-11-06', hasPublishedResult: false}), undefined);
    assert.equal(getLiveScoringHref(match, {today: match.scheduledDate, hasPublishedResult: true}), undefined);
    assert.equal(getLiveScoringHref({...match, awayTeamId: match.homeTeamId, homeTeamId: match.awayTeamId}, {today: match.scheduledDate, hasPublishedResult: false}), undefined);
  }
});

test('does not expose a Wild Turkey at Riptide live link while dates conflict', () => {
  const match = {
    id: 'ninjas-vs-riptide-c598d247-4dee-4c01-b57d-d5ab4f1f10b3',
    scheduledDate: '2026-11-22',
    awayTeamId: 'wild-turkey',
    homeTeamId: 'riptide',
  };
  assert.equal(getLiveScoringHref(match, {today: '2026-11-22', hasPublishedResult: false}), undefined);
  assert.equal(getLiveScoringHref({...match, scheduledDate: '2026-11-07'}, {today: '2026-11-07', hasPublishedResult: false}), undefined);
});
