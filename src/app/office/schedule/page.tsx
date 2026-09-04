import {OfficePage} from '@/components/commissioner/OfficePage';
import {ScheduleSpreadsheetManagement} from '@/components/schedule/ScheduleSpreadsheetManagement';

export default function OfficeSchedulePage() {
  return (
    <OfficePage sectionId="schedule">
      <ScheduleSpreadsheetManagement />
    </OfficePage>
  );
}
