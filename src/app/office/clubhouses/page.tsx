import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {getCommissionerProfile} from '@/lib/clubhouse';

type Props = {searchParams?: Promise<Record<string, string | string[] | undefined>>};

function pick(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] : value; }

export default async function OfficeClubhousesPage({searchParams}: Props) {
  const params = searchParams ? await searchParams : {};
  const selectedTeamId = pick(params.team);
  const supabase = await createClient();
  const commissioner = await getCommissionerProfile(supabase);
  if (!commissioner) return null;
  const db = supabase as any;

  const {data: season} = await db.from('launch_seasons').select('id,name').eq('active', true).eq('archived', false).order('year', {ascending:false}).limit(1).maybeSingle();
  if (!season) return <section className="office-panel"><h1>Clubhouses</h1><p>No active season.</p></section>;

  const {data: seasonTeams} = await db.from('launch_season_teams').select('team_id').eq('season_id', season.id);
  const teamIds = (seasonTeams ?? []).map((row:any) => row.team_id);
  const {data: teams} = teamIds.length ? await db.from('launch_teams').select('id,name,short_name,logo,primary_color').in('id', teamIds).order('name') : {data:[]};
  const selectedTeam = (teams ?? []).find((team:any) => team.id === selectedTeamId) ?? (teams ?? [])[0] ?? null;

  let posts:any[] = [];
  let profiles:any[] = [];
  let comments:any[] = [];
  if (selectedTeam) {
    const postResult = await db.from('launch_clubhouse_posts').select('id,author_profile_id,title,body,pinned_at,created_at').eq('season_id', season.id).eq('team_id', selectedTeam.id).order('created_at', {ascending:false}).limit(100);
    posts = postResult.data ?? [];
    const postIds = posts.map((post:any) => post.id);
    const commentResult = postIds.length ? await db.from('launch_clubhouse_comments').select('id,post_id,author_profile_id,parent_comment_id,body,created_at').in('post_id', postIds).order('created_at') : {data:[]};
    comments = commentResult.data ?? [];
    const profileIds = [...new Set([...posts.map((post:any)=>post.author_profile_id), ...comments.map((comment:any)=>comment.author_profile_id)])];
    const profileResult = profileIds.length ? await db.from('launch_profiles').select('id,display_name').in('id', profileIds) : {data:[]};
    profiles = profileResult.data ?? [];
  }
  const names = new Map(profiles.map((profile:any)=>[profile.id, profile.display_name]));

  return (
    <section className="office-panel">
      <div className="office-section-heading">
        <div><span className="eyebrow">Private team review · {season.name}</span><h1>Clubhouses</h1></div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:10,marginBottom:24}}>
        {(teams ?? []).map((team:any) => {
          const active = selectedTeam?.id === team.id;
          return (
            <Link
              key={team.id}
              href={`/office/clubhouses?team=${encodeURIComponent(team.id)}`}
              aria-current={active ? 'page' : undefined}
              style={{
                display:'flex',alignItems:'center',gap:10,padding:'12px 14px',
                border:`1px solid ${active ? (team.primary_color || '#c89b22') : 'rgba(127,127,127,.24)'}`,
                borderLeft:`4px solid ${team.primary_color || '#c89b22'}`,
                borderRadius:10,textDecoration:'none',color:'inherit',
                background:active ? 'rgba(127,127,127,.08)' : 'transparent'
              }}
            >
              {team.logo ? <img src={team.logo} alt="" width={34} height={34} style={{objectFit:'contain',flex:'0 0 34px'}} /> : null}
              <div style={{minWidth:0}}>
                <strong style={{display:'block'}}>{team.name}</strong>
                <small style={{opacity:.62}}>{active ? 'Currently viewing' : 'Open review'}</small>
              </div>
            </Link>
          );
        })}
      </div>

      {selectedTeam ? <>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
          <div>
            <h2 style={{marginBottom:4}}>{selectedTeam.name}</h2>
            <p style={{opacity:.68,marginTop:0}}>Office review only. Team members cannot browse other Clubhouses.</p>
          </div>
          <Link href={`/office/clubhouses?team=${encodeURIComponent(selectedTeam.id)}`} className="office-chip">Refresh review</Link>
        </div>
        <div style={{display:'grid',gap:12,marginTop:16}}>
          {posts.map((post:any) => <article key={post.id} style={{border:'1px solid rgba(127,127,127,.24)',borderRadius:14,padding:14}}>
            <div style={{display:'flex',justifyContent:'space-between',gap:12}}><strong>{names.get(post.author_profile_id) || 'Member'}</strong><small>{new Date(post.created_at).toLocaleString()}</small></div>
            {post.pinned_at ? <small style={{fontWeight:800}}>PINNED</small> : null}
            {post.title ? <h3>{post.title}</h3> : null}
            <p style={{whiteSpace:'pre-wrap'}}>{post.body}</p>
            {comments.filter((comment:any)=>comment.post_id===post.id).length ? <details><summary>Comments · {comments.filter((comment:any)=>comment.post_id===post.id).length}</summary><div style={{display:'grid',gap:8,marginTop:8}}>{comments.filter((comment:any)=>comment.post_id===post.id).map((comment:any)=><div key={comment.id} style={{paddingLeft:comment.parent_comment_id?18:0}}><strong>{names.get(comment.author_profile_id)||'Member'}</strong><div>{comment.body}</div></div>)}</div></details> : null}
          </article>)}
          {!posts.length ? <p>No Clubhouse posts yet.</p> : null}
        </div>
      </> : <p>No teams are active for this season.</p>}
    </section>
  );
}
