import {OfficePage} from '@/components/commissioner/OfficePage';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';
import {approveApplication, rejectApplication} from './actions';

export const dynamic = 'force-dynamic';

type OfficeApplicationsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type ApplicationRow = {
  id: string;
  profile_id: string;
  season_id: string;
  requested_team_id: string;
  player_type: string;
  gender: string;
  played_before: boolean;
  status: string;
  created_at: string;
};
type ProfileRow = {id: string; display_name: string};
type TeamRow = {id: string; name: string};
type ClaimRow = {
  id: string;
  profile_id: string;
  requested_player_id: string | null;
  submitted_name: string;
  submitted_pdga_number: string;
  status: string;
  created_at: string;
};
type ClaimedPlayerRow = {id: string; name: string; pdga_number: string};

type ApplicationsQueryClient = {
  from: (relation: 'launch_player_applications') => {
    select: (columns: '*') => {
      order: (column: 'created_at', options: {ascending: boolean}) => Promise<{
        data: ApplicationRow[] | null;
        error: {message: string} | null;
      }>;
    };
  };
};

export default async function OfficeApplicationsPage({searchParams}: OfficeApplicationsPageProps) {
  const params = searchParams ? await searchParams : {};
  const notice = readParam(params.notice);
  const actionError = readParam(params.error);

  if (!hasSupabaseConfig()) {
    return <OfficePage sectionId="applications"><p>Supabase is not configured.</p></OfficePage>;
  }

  const supabase = await createClient();
  const applicationsClient = supabase as unknown as ApplicationsQueryClient;
  const {data: applications, error} = await applicationsClient
    .from('launch_player_applications')
    .select('*')
    .order('created_at', {ascending: false});

  const applicationRows = applications ?? [];
  const profileIds = [...new Set(applicationRows.map((item) => item.profile_id))];
  const teamIds = [...new Set(applicationRows.map((item) => item.requested_team_id).filter((id): id is string => Boolean(id)))];

  let profiles: ProfileRow[] = [];
  if (profileIds.length) {
    const result = await supabase.from('launch_profiles').select('id, display_name').in('id', profileIds);
    profiles = result.data ?? [];
  }

  let teams: TeamRow[] = [];
  if (teamIds.length) {
    const result = await supabase.from('launch_teams').select('id, name').in('id', teamIds);
    teams = result.data ?? [];
  }

  let claims: ClaimRow[] = [];
  if (profileIds.length) {
    const result = await supabase
      .from('launch_player_claims')
      .select('id, profile_id, requested_player_id, submitted_name, submitted_pdga_number, status, created_at')
      .in('profile_id', profileIds)
      .order('created_at', {ascending: false});
    claims = result.data ?? [];
  }

  const requestedPlayerIds = [...new Set(claims.map((claim) => claim.requested_player_id).filter((id): id is string => Boolean(id)))];
  let claimedPlayers: ClaimedPlayerRow[] = [];
  if (requestedPlayerIds.length) {
    const result = await supabase.from('launch_players').select('id, name, pdga_number').in('id', requestedPlayerIds);
    claimedPlayers = result.data ?? [];
  }

  const profileNames = new Map(profiles.map((profile) => [profile.id, profile.display_name]));
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));
  const playerNames = new Map(claimedPlayers.map((player) => [player.id, player]));
  const latestClaimByProfile = new Map<string, ClaimRow>();
  for (const claim of claims) {
    if (!latestClaimByProfile.has(claim.profile_id)) latestClaimByProfile.set(claim.profile_id, claim);
  }

  const pendingCount = applicationRows.filter((item) => item.status === 'Pending').length;

  return (
    <OfficePage sectionId="applications">
      <section className="office-panel">
        <div className="office-panel-heading">
          <div>
            <span className="office-eyebrow">Registration review</span>
            <h2>Player applications</h2>
          </div>
          <strong>{pendingCount} pending</strong>
        </div>

        {notice ? <div className="office-notice">{notice}</div> : null}
        {actionError ? <div className="office-error">{actionError}</div> : null}
        {error ? <p>Applications could not be loaded: {error.message}</p> : null}
        {!error && !applicationRows.length ? <p>No player applications have been received yet.</p> : null}

        {applicationRows.map((application) => {
          const claim = latestClaimByProfile.get(application.profile_id);
          const claimedPlayer = claim?.requested_player_id ? playerNames.get(claim.requested_player_id) : undefined;

          return (
            <article className="office-card" key={application.id} style={{marginTop: '1rem'}}>
              <div className="office-panel-heading">
                <div>
                  <h3>{profileNames.get(application.profile_id) ?? 'Unknown applicant'}</h3>
                  <p>{application.player_type} · {application.gender} · {application.played_before ? 'Returning player' : 'New player'}</p>
                </div>
                <strong>{application.status}</strong>
              </div>

              <p><strong>Requested team:</strong> {teamNames.get(application.requested_team_id ?? '') ?? application.requested_team_id ?? 'No preference'}</p>
              <p><strong>Submitted:</strong> {new Date(application.created_at).toLocaleString()}</p>

              {application.played_before ? (
                <div style={{marginTop: '0.75rem'}}>
                  <p><strong>Returning-player claim:</strong> {claim?.status ?? 'No claim found'}</p>
                  {claim ? <p><strong>Submitted identity:</strong> {claim.submitted_name}{claim.submitted_pdga_number ? ` · PDGA ${claim.submitted_pdga_number}` : ''}</p> : null}
                  {claimedPlayer ? <p><strong>Selected player:</strong> {claimedPlayer.name}{claimedPlayer.pdga_number ? ` · PDGA ${claimedPlayer.pdga_number}` : ''}</p> : null}
                  {claim?.status === 'Pending' && !claim.requested_player_id
                    ? <p className="office-error">Choose/link the returning player record before approval.</p>
                    : null}
                </div>
              ) : null}

              {application.status === 'Pending' ? (
                <div className="editor-actions" style={{marginTop: '1rem'}}>
                  <form action={approveApplication}>
                    <input type="hidden" name="applicationId" value={application.id} />
                    <button className="publish-action" type="submit">Approve</button>
                  </form>
                  <form action={rejectApplication}>
                    <input type="hidden" name="applicationId" value={application.id} />
                    <button className="secondary" type="submit">Reject</button>
                  </form>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </OfficePage>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
