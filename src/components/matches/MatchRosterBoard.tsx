import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import type {OfficialMatchRoster, OfficialSnapshotState} from '@/domain/match-roster/MatchRosterSnapshot';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import type {LazyRosterPlayer} from '@/app/matches/[id]/publicRosterActions';
import {getStoredTeamById} from '@/services/teams/TeamStore';
import {createClient} from '@/lib/supabase/server';
import {LazyActiveRosterCard} from '@/components/matches/LazyActiveRosterCard';
import {LazyAvailabilityRosterCard} from '@/components/matches/LazyAvailabilityRosterCard';
import {LockedRosterPair} from '@/components/matches/LockedRosterPair';
import {buildPublicAvailabilityPreview} from '@/services/matches/PublicAvailability';
import styles from '@/app/matches/[id]/Matchday.module.css';
import v1 from '@/app/matches/[id]/MatchdayV1.module.css';

export type PublicMatchAvailability = ReadonlyMap<string, TeamAttendanceMember[]>;

const PREVIEW_COUNT = 5;

export async function MatchRosterBoard({
  matchday,
  official,
  rosterUnavailable = false,
  availability,
  availabilityUnavailable = false,
}: {
  matchday: PublicMatchday;
  official?: OfficialSnapshotState;
  rosterUnavailable?: boolean;
  availability?: PublicMatchAvailability;
  availabilityUnavailable?: boolean;
}) {
  if (official?.status === 'unavailable') {
    return <Unavailable title="Official roster temporarily unavailable" detail="The match page remains available while the official roster is recovered." />;
  }

  if (rosterUnavailable) {
    return <Unavailable title="Roster temporarily unavailable" detail="The match page remains available while the active season roster is recovered." />;
  }

  if (availabilityUnavailable) {
    return <Unavailable title="Availability temporarily unavailable" detail="The team rosters are intact, but current player responses could not be loaded." />;
  }

  if (official?.status === 'complete') {
    const away = findRoster(official.rosters, matchday.awayTeam.id);
    const home = findRoster(official.rosters, matchday.homeTeam.id);
    const [awayStoredTeam, homeStoredTeam, borrowedLabels] = await Promise.all([
      getStoredTeamById(matchday.awayTeam.id),
      getStoredTeamById(matchday.homeTeam.id),
      getBorrowedRosterLabels(matchday.id),
    ]);

    return (
      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}>
          <div><span>Official match roster</span><h2>Locked roster</h2></div>
        </header>
        <LockedRosterPair
          away={{
            name: away.teamNameSnapshot,
            label: 'Away',
            logo: matchday.awayTeam.logo,
            accent: awayStoredTeam?.primaryColor,
            players: away.players.map((player) => ({
              name: player.playerNameSnapshot,
              meta: borrowedLabels.get(player.playerId),
            })),
          }}
          home={{
            name: home.teamNameSnapshot,
            label: 'Home',
            logo: matchday.homeTeam.logo,
            accent: homeStoredTeam?.primaryColor,
            players: home.players.map((player) => ({
              name: player.playerNameSnapshot,
              meta: borrowedLabels.get(player.playerId),
            })),
          }}
        />
      </section>
    );
  }

  if (availability) {
    const awayPreview = buildPublicAvailabilityPreview(
      availability.get(matchday.awayTeam.id) ?? [],
    );
    const homePreview = buildPublicAvailabilityPreview(
      availability.get(matchday.homeTeam.id) ?? [],
    );
    return (
      <section className={styles.sectionCard}>
        <header className={styles.sectionHeader}>
          <div><span>Match roster</span><h2>Player availability</h2></div>
        </header>
        <div className={v1.previewGrid}>
          <LazyAvailabilityRosterCard
            teamName={matchday.awayTeam.name}
            label="Away"
            teamId={matchday.awayTeam.id}
            matchId={matchday.id}
            previewPlayers={awayPreview.previewPlayers}
            remainingCount={awayPreview.remainingCount}
          />
          <LazyAvailabilityRosterCard
            teamName={matchday.homeTeam.name}
            label="Home"
            teamId={matchday.homeTeam.id}
            matchId={matchday.id}
            previewPlayers={homePreview.previewPlayers}
            remainingCount={homePreview.remainingCount}
          />
        </div>
      </section>
    );
  }

  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}>
        <div><span>Match roster</span><h2>Active team rosters</h2></div>
      </header>
      <div className={v1.previewGrid}>
        <LazyActiveRosterCard
          teamName={matchday.awayTeam.name}
          label="Away"
          teamId={matchday.awayTeam.id}
          matchId={matchday.id}
          previewPlayers={matchday.awayTeam.roster.slice(0, PREVIEW_COUNT).map(toLazyRosterPlayer)}
          remainingCount={Math.max(0, matchday.awayTeam.roster.length - PREVIEW_COUNT)}
        />
        <LazyActiveRosterCard
          teamName={matchday.homeTeam.name}
          label="Home"
          teamId={matchday.homeTeam.id}
          matchId={matchday.id}
          previewPlayers={matchday.homeTeam.roster.slice(0, PREVIEW_COUNT).map(toLazyRosterPlayer)}
          remainingCount={Math.max(0, matchday.homeTeam.roster.length - PREVIEW_COUNT)}
        />
      </div>
    </section>
  );
}

function Unavailable({title, detail}: {title: string; detail: string}) {
  return (
    <section className={styles.sectionCard}>
      <header className={styles.sectionHeader}><div><span>Match roster</span><h2>{title}</h2></div></header>
      <p className={styles.empty}>{detail}</p>
    </section>
  );
}

function findRoster(rosters: OfficialMatchRoster[], teamId: string): OfficialMatchRoster {
  const roster = rosters.find((candidate) => candidate.teamId === teamId);
  if (!roster) throw new Error(`Official roster manifest missing for ${teamId}.`);
  return roster;
}

function toLazyRosterPlayer(player: LaunchPlayer): LazyRosterPlayer {
  return {
    id: player.id,
    name: player.name,
    gender: player.gender,
    pdgaRating: player.pdgaRating,
    clashIndex: player.clashIndex ?? null,
    clashIndexProvisional: player.clashIndexProvisional === true,
  };
}


async function getBorrowedRosterLabels(matchId: string): Promise<Map<string, string>> {
  try {
    const supabase = await createClient();
    const {data, error} = await (supabase as any)
      .from('launch_match_roster_loans')
      .select('player_id,original_team_id')
      .eq('match_id', matchId)
      .is('removed_at', null);
    if (error || !data?.length) return new Map();

    const originalTeamIds = [...new Set(
      data
        .map((row: {original_team_id?: string}) => row.original_team_id)
        .filter((teamId: string | undefined): teamId is string => Boolean(teamId)),
    )];
    const teams = await Promise.all(originalTeamIds.map((teamId) => getStoredTeamById(teamId)));
    const names = new Map<string, string>();
    for (const team of teams) {
      if (team) names.set(team.id, team.name);
    }

    return new Map<string, string>(
      data.map((row: {player_id: string; original_team_id: string}) => [
        row.player_id,
        `Borrowed · ${names.get(row.original_team_id) ?? 'League'}`,
      ] as const),
    );
  } catch {
    return new Map();
  }
}
