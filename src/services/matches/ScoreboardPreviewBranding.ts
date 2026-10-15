import type {FinalMatchTeam} from './FinalMatchdaySnapshot';

// Only public team identity fields. The local TCWhiteboard JSON remains on
// the device and is never sent to the team's database.
export type PublicTeamBranding = Pick<
  FinalMatchTeam,
  'id' | 'name' | 'shortName' | 'logo' | 'primaryColor' | 'secondaryColor'
>;

/** Verified public team assets used only if the public directory is unavailable. */
export const FALLBACK_PREVIEW_BRANDING: PublicTeamBranding[] = [
  {
    id: 'hayneous-og-s',
    name: "Hayneous OG's",
    shortName: 'HOS',
    logo: 'https://iwyssbrekhwkjnlagxzc.supabase.co/storage/v1/object/public/team-logos/teams/hayneous-og-s/logo.webp',
    primaryColor: '#1a0a52',
    secondaryColor: '#a7c6ff',
  },
  {
    id: 'ninjas',
    name: 'Ninjas',
    shortName: 'NIN',
    logo: '/team-logos/ninjas.jpg',
    primaryColor: '#bf9222',
    secondaryColor: '#000000',
  },
];

const normalize = (value: string) =>
  value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');

export function findPublicTeamBranding(
  team: {id: string; slug: string; name: string},
  branding: readonly PublicTeamBranding[],
): PublicTeamBranding | null {
  // TCWhiteboard player/team IDs belong to its own system; match league teams
  // by a normalized public team slug/name, never by generated TCWhiteboard IDs.
  const matches = [team.slug, team.name].map(normalize).filter(Boolean);
  if (!matches.length) return null;
  return branding.find((row) => [row.id, row.name].some((part) =>
    matches.includes(normalize(part)),
  )) ?? null;
}
