import {OfficePage} from '@/components/commissioner/OfficePage';
import {TeamManagement} from '@/components/teams/TeamManagement';

export default function OfficeTeamsPage() {
  return (
    <OfficePage sectionId="teams">
      <TeamManagement />
    </OfficePage>
  );
}
