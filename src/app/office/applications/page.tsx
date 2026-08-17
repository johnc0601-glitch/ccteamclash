import {OfficePage} from '@/components/commissioner/OfficePage';
import {hasSupabaseConfig} from '@/lib/supabase';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function OfficeApplicationsPage() {
  if (!hasSupabaseConfig()) {
    return <OfficePage sectionId="applications"><p>Supabase is not configured.</p></OfficePage>;
  }

  const supabase = await createClient();
  const {data: applications, error} = await supabase
    .from('launch_player_applications')
    .select('*')
    .order('created_at', {ascending: false});

  const profileIds = [...new Set((applications ?? []).map((item) => item.profile_id))];
  const teamIds = [...new Set((applications ?? []).map((item) => item.requested_team_id).filter(Boolean))];

  const [{data: profiles}, {data: teams}] = await Promise.all([
    profileIds.length ? supabase.from('launch_profiles').select('id, display_name').in('id', profileIds) : Promise.resolve({data: []}),
    teamIds.length ? supabase.from('launch_teams').select('id, name').in('id', teamIds) : Promise.resolve({data: []}),
  ]);

  const profileNames = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
  const teamNames = new Map((teams ?? []).map((team) => [team.id, team.name]));

  return (
    <OfficePage sectionId="applications">
      <section className="office-panel">
        <div className="office-panel-heading">
          <div>
            <span className="office-eyebrow">Registration review</span>
            <h2>Player applications</h2>
          </div>
          <strong>{(applications ?? []).filter((item) => item.status === 'Pending').length} pending</strong>
        </div>
        {error ? <p>Applications could not be loaded: {error.message}</p> : null}
        {!error && !(applications ?? []).length ? <p>No player applications have been received yet.</p> : null}
        {(applications ?? []).map((application) => (
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
          </article>
        ))}
      </section>
    </OfficePage>
  );
}
