import {OfficePage} from '@/components/commissioner/OfficePage';
import {MemberManagement} from '@/components/launch/MemberManagement';

export default function OfficeMembersPage() {
  return (
    <OfficePage sectionId="members">
      <MemberManagement />
    </OfficePage>
  );
}
