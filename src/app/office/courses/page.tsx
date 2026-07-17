import {CourseManagement} from '@/components/courses/CourseManagement';
import {OfficePage} from '@/components/commissioner/OfficePage';

export default function OfficeCoursesPage() {
  return (
    <OfficePage sectionId="courses">
      <CourseManagement />
    </OfficePage>
  );
}
