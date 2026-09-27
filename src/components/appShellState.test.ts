import assert from 'node:assert/strict';
import test from 'node:test';
import {getAppShellTabs} from '@/components/appShellState';

function active(pathname: string, activeTeamId: string | null) {
  return getAppShellTabs(pathname, activeTeamId).filter((tab) => tab.active).map((tab) => tab.label);
}

test('routes the signed-in member current team to Team', () => {
  assert.deepEqual(active('/teams/dark-knights', 'dark-knights'), ['Team']);
});

test('routes another team and player pages to League', () => {
  assert.deepEqual(active('/teams/kure-beach', 'dark-knights'), ['League']);
  assert.deepEqual(active('/players', 'dark-knights'), ['League']);
});

test('routes clubhouse and captain pages to Team', () => {
  assert.deepEqual(active('/clubhouse', 'dark-knights'), ['Team']);
  assert.deepEqual(active('/captain/free-agents', 'dark-knights'), ['Team']);
});

test('routes Matchday and match pages to Matchday', () => {
  assert.deepEqual(active('/matchday', 'dark-knights'), ['Matchday']);
  assert.deepEqual(active('/matches/kb-at-dark-knights-2026-r1', 'dark-knights'), ['Matchday']);
});

test('routes account surfaces to Me', () => {
  assert.deepEqual(active('/account/notifications', 'dark-knights'), ['Me']);
  assert.deepEqual(active('/auth/callback', 'dark-knights'), ['Me']);
});

test('anonymous team directory remains the Team entry point', () => {
  assert.deepEqual(active('/teams', null), ['Team']);
  const team = getAppShellTabs('/teams', null).find((tab) => tab.label === 'Team');
  assert.equal(team?.href, '/teams');
});
