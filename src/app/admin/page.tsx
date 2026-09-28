import {permanentRedirect} from 'next/navigation';

export default function AdminCompatibilityRedirect() {
  permanentRedirect('/office/media');
}
