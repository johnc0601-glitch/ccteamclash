import Link from 'next/link';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';
import {getOwnClubhouseContext} from '@/lib/clubhouse';
import {
  addClubhouseComment,
  createClubhousePost,
  deleteClubhousePost,
  reactToClubhousePost,
  setClubhouseAttendance,
  toggleClubhousePin,
} from './actions';
import styles from './Clubhouse.module.css';

type Props = {searchParams?: Promise<Record<string, string | string[] | undefined>>};

const REACTIONS = [['like','👍'],['love','❤️'],['laugh','😂'],['fire','🔥']] as const;

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric'}).format(new Date(`${value}T12:00:00`));
}

export default async function ClubhousePage({searchParams}: Props) {
  const params = searchParams ? await searchParams : {};
  const notice = readParam(params.notice);
  const error = readParam(params.error);
  const supabase = await createClient();
  const context = await getOwnClubhouseContext(supabase);
  if (!context) redirect('/account');
  const db = supabase as any;

  const [{data: matches}, {data: rosterRows}, {data: posts}] = await Promise.all([
    db.from('launch_schedule_matches')
      .select('id,home_team_id,away_team_id,course_id,date,time,status,public_slug')
      .eq('season_id', context.seasonId)
      .or(`home_team_id.eq.${context.teamId},away_team_id.eq.${context.teamId}`)
      .order('date', {ascending: true}),
    db.from('launch_season_roster_memberships')
      .select('player_id')
      .eq('season_id', context.seasonId)
      .eq('team_id', context.teamId)
      .eq('status', 'Active'),
    db.from('launch_clubhouse_posts')
      .select('id,author_profile_id,title,body,pinned_at,created_at,updated_at')
      .eq('season_id', context.seasonId)
      .eq('team_id', context.teamId)
      .order('created_at', {ascending: false})
      .limit(100),
  ]);

  const teamMatchRows = (matches ?? []) as any[];
  const today = new Date().toISOString().slice(0, 10);
  const nextMatch = teamMatchRows.find((match) => match.date && match.date >= today && match.status !== 'Completed') ?? null;
  const teamIds = [...new Set(teamMatchRows.flatMap((match) => [match.home_team_id, match.away_team_id]).filter(Boolean))];
  const courseIds = [...new Set(teamMatchRows.map((match) => match.course_id).filter(Boolean))];
  const playerIds = (rosterRows ?? []).map((row: any) => row.player_id);
  const postIds = (posts ?? []).map((post: any) => post.id);
  const profileIds = (posts ?? []).map((post: any) => post.author_profile_id);

  const [teamResult, courseResult, playerResult, attendanceResult, commentResult, reactionResult] = await Promise.all([
    teamIds.length ? db.from('launch_teams').select('id,name').in('id', teamIds) : Promise.resolve({data: []}),
    courseIds.length ? db.from('launch_courses').select('id,name').in('id', courseIds) : Promise.resolve({data: []}),
    playerIds.length ? db.from('launch_players').select('id,name').in('id', playerIds) : Promise.resolve({data: []}),
    nextMatch ? db.from('launch_match_attendance').select('player_id,status').eq('match_id', nextMatch.id).eq('team_id', context.teamId) : Promise.resolve({data: []}),
    postIds.length ? db.from('launch_clubhouse_comments').select('id,post_id,author_profile_id,parent_comment_id,body,created_at').in('post_id', postIds).order('created_at', {ascending: true}) : Promise.resolve({data: []}),
    postIds.length ? db.from('launch_clubhouse_post_reactions').select('post_id,profile_id,reaction_type').in('post_id', postIds) : Promise.resolve({data: []}),
  ]);

  const commentAuthorIds = (commentResult.data ?? []).map((comment: any) => comment.author_profile_id);
  const allProfileIds = [...new Set([...profileIds, ...commentAuthorIds])];
  const {data: authorProfiles} = allProfileIds.length
    ? await db.from('launch_profiles').select('id,display_name').in('id', allProfileIds)
    : {data: []};

  const teams = new Map((teamResult.data ?? []).map((row: any) => [row.id, row.name]));
  const courses = new Map((courseResult.data ?? []).map((row: any) => [row.id, row.name]));
  const players = new Map((playerResult.data ?? []).map((row: any) => [row.id, row.name]));
  const authors = new Map((authorProfiles ?? []).map((row: any) => [row.id, row.display_name]));
  const attendance = new Map((attendanceResult.data ?? []).map((row: any) => [row.player_id, row.status]));

  const going = playerIds.filter((id: string) => attendance.get(id) === 'Playing');
  const notGoing = playerIds.filter((id: string) => attendance.get(id) === 'NotPlaying');
  const undecided = playerIds.filter((id: string) => !attendance.has(id));
  const ownStatus = attendance.get(context.playerId) ?? 'Unconfirmed';

  return (
    <main className={`shell ${styles.page}`}>
      <header className={styles.hero}>
        <div>
          <span className={styles.kicker}>Private team space · {context.seasonName}</span>
          <h1>{context.teamName} Clubhouse</h1>
        </div>
        {context.teamLogo ? <img src={context.teamLogo} alt="" width={76} height={76} /> : null}
      </header>

      {notice ? <p className={styles.notice}>{notice}</p> : null}
      {error ? <p className={styles.error}>{error}</p> : null}

      {nextMatch ? (
        <section className={styles.matchCard}>
          <div>
            <span className={styles.kicker}>Next match</span>
            <h2>{nextMatch.away_team_id === context.teamId ? `${context.teamName} @ ${teams.get(nextMatch.home_team_id) ?? 'Opponent'}` : `${teams.get(nextMatch.away_team_id) ?? 'Opponent'} @ ${context.teamName}`}</h2>
            <p>{formatDate(nextMatch.date)} · {courses.get(nextMatch.course_id) ?? 'Location TBD'}</p>
          </div>
          <Link href={`/matches/${nextMatch.public_slug || nextMatch.id}`}>Open Matchday</Link>
        </section>
      ) : null}

      {nextMatch ? (
        <section className={styles.panel}>
          <div className={styles.sectionHeading}><div><span className={styles.kicker}>Availability</span><h2>Are you coming?</h2></div><strong>{going.length} going</strong></div>
          <div className={styles.rsvpRow}>
            {[
              ['Playing','Going','green'],
              ['NotPlaying','Not going','red'],
              ['Unconfirmed','Undecided','yellow'],
            ].map(([status,label,tone]) => (
              <form action={setClubhouseAttendance} key={status}>
                <input type="hidden" name="matchId" value={nextMatch.id} />
                <button className={`${styles.rsvp} ${styles[tone]} ${ownStatus === status ? styles.selected : ''}`} name="status" value={status}>{label}</button>
              </form>
            ))}
          </div>
          <details className={styles.details}>
            <summary>View players</summary>
            <div className={styles.statusLists}>
              <StatusList label="Going" tone="green" ids={going} players={players} />
              <StatusList label="Not going" tone="red" ids={notGoing} players={players} />
              <StatusList label="Undecided" tone="yellow" ids={undecided} players={players} />
            </div>
          </details>
        </section>
      ) : null}

      <details className={`${styles.panel} ${styles.details}`}>
        <summary>Team schedule</summary>
        <div className={styles.schedule}>
          {teamMatchRows.map((match) => {
            const opponentId = match.home_team_id === context.teamId ? match.away_team_id : match.home_team_id;
            const side = match.home_team_id === context.teamId ? 'vs' : '@';
            return <Link href={`/matches/${match.public_slug || match.id}`} key={match.id}><strong>{formatDate(match.date)}</strong><span>{side} {teams.get(opponentId) ?? 'Opponent'}</span><small>{courses.get(match.course_id) ?? 'Location TBD'}</small></Link>;
          })}
        </div>
      </details>

      <section className={styles.composer}>
        <span className={styles.kicker}>Team discussion</span>
        <h2>Post to the Clubhouse</h2>
        <form action={createClubhousePost}>
          <input name="title" maxLength={120} placeholder="Optional title" />
          <textarea name="body" maxLength={3000} rows={4} placeholder="Share something with your team" required />
          <button type="submit">Post</button>
        </form>
      </section>

      <section className={styles.feed}>
        {(posts ?? []).map((post: any) => {
          const comments = (commentResult.data ?? []).filter((comment: any) => comment.post_id === post.id);
          const reactions = (reactionResult.data ?? []).filter((reaction: any) => reaction.post_id === post.id);
          const canManage = context.isCaptain || context.isCommissioner || post.author_profile_id === context.profileId;
          return (
            <article className={`${styles.post} ${post.pinned_at ? styles.pinned : ''}`} key={post.id}>
              <div className={styles.postTop}>
                <div><strong>{authors.get(post.author_profile_id) ?? 'Member'}</strong><span>{new Date(post.created_at).toLocaleString()}</span></div>
                {post.pinned_at ? <b>Pinned</b> : null}
              </div>
              {post.title ? <h3>{post.title}</h3> : null}
              <p>{post.body}</p>
              <div className={styles.postTools}>
                {REACTIONS.map(([key,icon]) => {
                  const count = reactions.filter((reaction: any) => reaction.reaction_type === key).length;
                  const active = reactions.some((reaction: any) => reaction.reaction_type === key && reaction.profile_id === context.profileId);
                  return <form action={reactToClubhousePost} key={key}><input type="hidden" name="postId" value={post.id}/><button data-active={active} name="reactionType" value={key}>{icon}{count ? ` ${count}` : ''}</button></form>;
                })}
                {(context.isCaptain || context.isCommissioner) ? <form action={toggleClubhousePin}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="pinned" value={post.pinned_at ? 'true' : 'false'}/><button>{post.pinned_at ? 'Unpin' : 'Pin'}</button></form> : null}
                {canManage ? <form action={deleteClubhousePost}><input type="hidden" name="postId" value={post.id}/><button>Remove</button></form> : null}
              </div>
              <div className={styles.comments}>
                {comments.filter((comment: any) => !comment.parent_comment_id).map((comment: any) => (
                  <div className={styles.comment} key={comment.id}>
                    <strong>{authors.get(comment.author_profile_id) ?? 'Member'}</strong><p>{comment.body}</p>
                    {comments.filter((reply: any) => reply.parent_comment_id === comment.id).map((reply: any) => <div className={styles.reply} key={reply.id}><strong>{authors.get(reply.author_profile_id) ?? 'Member'}</strong><span>{reply.body}</span></div>)}
                    <form action={addClubhouseComment} className={styles.replyForm}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="parentCommentId" value={comment.id}/><input name="body" maxLength={1500} placeholder="Reply" required/><button>Reply</button></form>
                  </div>
                ))}
                <form action={addClubhouseComment} className={styles.commentForm}><input type="hidden" name="postId" value={post.id}/><input name="body" maxLength={1500} placeholder="Add a comment" required/><button>Comment</button></form>
              </div>
            </article>
          );
        })}
        {!(posts ?? []).length ? <p className={styles.empty}>No posts yet.</p> : null}
      </section>
    </main>
  );
}

function StatusList({label,tone,ids,players}: {label:string;tone:'green'|'red'|'yellow';ids:string[];players:Map<string,string>}) {
  return <div className={styles.statusGroup}><h3 className={styles[tone]}>{label} · {ids.length}</h3>{ids.length ? ids.map((id) => <span key={id}>{players.get(id) ?? 'Player'}</span>) : <span>None</span>}</div>;
}
