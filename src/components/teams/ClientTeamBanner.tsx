import type {Team} from '@/models/Team';
import {TeamBanner} from '@/components/teams/TeamBanner';

type ClientTeamBannerProps = {
  initialTeam: Team;
};

/**
 * Team pages already load their team on the server. Keep the banner server-only
 * rather than immediately issuing a duplicate no-store /api/teams request after
 * hydration.
 */
export function ClientTeamBanner({initialTeam}: ClientTeamBannerProps) {
  return <TeamBanner team={initialTeam} />;
}
