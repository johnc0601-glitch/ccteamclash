import {permanentRedirect} from 'next/navigation';

export default function RankingsRedirect() {
  permanentRedirect('/stats');
}
