import {OfficePage} from '@/components/commissioner/OfficePage';
import {PlayerManagement} from '@/components/players/PlayerManagement';

export default function OfficePlayersPage() {
  return (
    <OfficePage sectionId="players">
      <PlayerManagement />
    </OfficePage>
  );
}
