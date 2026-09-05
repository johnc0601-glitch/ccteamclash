import {redirect} from 'next/navigation';

export default function FreeAgencyPage() {
  redirect('/account?notice=Choose Free Agent from the Team list.');
}
