import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {getCommissionerProfile} from '@/lib/clubhouse';

export default async function OfficeClubhousesPage() {
  const supabase = await createClient();
  const commissioner = await getCommissionerProfile(supabase);
  if (!commissioner) return null;
  const db = supabase as any;

  const {data: season} = await db.from('launch_seasons').select('id,name').eq('active', true).eq('archived', false).order('year', {ascending:false}).limit(1).maybeSingle();
  if (!season) return <section className="office-panel"><h1>Clubhouses</h1><p>No active season.</p></section>;

  const {data: seasonTeams} = await db.from('launch_season_teams').select('team_id').eq('season_id', season.id);
  const teamIds = (seasonTeams ?? []).map((row:any) => row.team_id);
  const {data: teams} = teamIds.length ? await db.from('launch_teams').select('id,name,short_name,logo,primary_color').in('id', teamIds).order('name') : {data:[]};

  return (
    <section className="office-panel">
      <div className="office-section-heading">
        <div><span className="eyebrow">Private team review · {season.name}</span><h1>Clubhouses</h1></div>
      </div>

      <p style={{opacity:.7,marginTop:0,marginBottom:22}}>Open any team’s actual Clubhouse in commissioner review mode. Team members can still access only their own Clubhouse.</p>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:12}}>
        {(teams ?? []).map((team:any) => (
          <Link
            key={team.id}
            href={`/clubhouse?team=${encodeURIComponent(team.id)}`}
            style={{
              display:'flex',alignItems:'center',gap:12,padding:'14px 16px',
              border:'1px solid rgba(127,127,127,.24)',
              borderLeft:`5px solid ${team.primary_color || '#c89b22'}`,
              borderRadius:12,textDecoration:'none',color:'inherit',
              background:'rgba(127,127,127,.04)'
            }}
          >
            {team.logo ? <img src={team.logo} alt="" width={42} height={42} style={{objectFit:'contain',flex:'0 0 42px'}} /> : null}
            <div style={{minWidth:0}}>
              <strong style={{display:'block',fontSize:'15px'}}>{team.name}</strong>
              <small style={{opacity:.62}}>Open Clubhouse →</small>
            </div>
          </Link>
        ))}
      </div>

      {!(teams ?? []).length ? <p>No teams are active for this season.</p> : null}
    </section>
  );
}
