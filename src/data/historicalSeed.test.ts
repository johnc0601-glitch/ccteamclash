import {getHistoricalSeasonArchives} from '@/data/historicalSeed';
import assert from 'node:assert/strict';
import test from 'node:test';

function recordCount(record: {wins: number; losses: number; ties: number}): number {
  return record.wins + record.losses + record.ties;
}

function expectedWinPercentage(record: {wins: number; losses: number; ties: number}): number {
  const total = recordCount(record);
  return total ? ((record.wins + record.ties * 0.5) / total) * 100 : 0;
}

test('historical archives preserve internally consistent player statistics', () => {
  const archives = getHistoricalSeasonArchives();
  assert.ok(archives.length > 0, 'Expected at least one historical season');

  for (const archive of archives) {
    const playerIds = new Set<string>();

    for (const summary of archive.playerSummaries) {
      assert.ok(!playerIds.has(summary.playerId), `${archive.seasonId}: duplicate player id ${summary.playerId}`);
      playerIds.add(summary.playerId);

      const singlesCount = recordCount(summary.singlesRecord);
      const doublesCount = recordCount(summary.doublesRecord);
      const overallCount = recordCount(summary.overallRecord);

      assert.equal(summary.matchesPlayed, overallCount, `${archive.seasonId}: ${summary.playerName} match count mismatch`);
      assert.equal(overallCount, singlesCount + doublesCount, `${archive.seasonId}: ${summary.playerName} singles/doubles mismatch`);
      assert.equal(summary.overallRecord.wins, summary.singlesRecord.wins + summary.doublesRecord.wins, `${archive.seasonId}: ${summary.playerName} wins mismatch`);
      assert.equal(summary.overallRecord.losses, summary.singlesRecord.losses + summary.doublesRecord.losses, `${archive.seasonId}: ${summary.playerName} losses mismatch`);
      assert.equal(summary.overallRecord.ties, summary.singlesRecord.ties + summary.doublesRecord.ties, `${archive.seasonId}: ${summary.playerName} ties mismatch`);
      assert.ok(
        Math.abs(summary.winPercentage - expectedWinPercentage(summary.overallRecord)) < 0.000001,
        `${archive.seasonId}: ${summary.playerName} win percentage mismatch`,
      );
    }
  }
});

test('historical archive standings and champions are coherent', () => {
  for (const archive of getHistoricalSeasonArchives()) {
    archive.standings.forEach((standing, index) => {
      assert.equal(standing.rank, index + 1, `${archive.seasonId}: non-sequential standing rank`);
      assert.equal(standing.matchesPlayed, recordCount(standing.record), `${archive.seasonId}: ${standing.teamName} match count mismatch`);
      assert.ok(standing.pointsPercentage >= 0 && standing.pointsPercentage <= 100, `${archive.seasonId}: ${standing.teamName} points percentage out of range`);
    });

    if (archive.championTeamId) {
      assert.ok(
        archive.standings.some((standing) => standing.teamId === archive.championTeamId),
        `${archive.seasonId}: champion is missing from final standings`,
      );
      assert.ok(archive.championTeamName, `${archive.seasonId}: champion name is missing`);
    }
  }
});
