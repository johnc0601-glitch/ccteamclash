import {OfficePage} from '@/components/commissioner/OfficePage';
import {SeasonManagement} from '@/components/seasons/SeasonManagement';

export default function OfficeSeasonsPage() {
  return (
    <OfficePage sectionId="seasons">
      <SeasonManagement />
    </OfficePage>
  );
}
