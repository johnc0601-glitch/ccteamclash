import type {CSSProperties} from 'react';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createClient} from '@/lib/supabase/server';
import {getClubhouseContext} from '@/lib/clubhouse';
import {getMutedProfileIds} from '@/lib/profileMutes';
import {MuteMemberControl} from '@/components/social/MuteMemberControl';
import {
  addClubhouseComment,
  createClubhousePost,
  deleteClubhousePost,
  editClubhouseComment,
  editClubhousePost,
  reportClubhouseContent,
  resolveClubhouseReport,
  reactToClubhousePost,
  removeClubhouseComment,
  setClubhouseAttendance,
  toggleClubhousePin,
} from './actions';
import {ClubhouseReadMarker} from './ClubhouseReadMarker';
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
  const requestedTeamId = readParam(params.team);
  const supabase = await createClient();
  const context = await getClubhouseContext(supabase, requestedTeamId);
  if (!context) {
    if (requestedTeamId) redirect('/clubhouse?error=That Clubhouse is private to its team.');
    redirect('/account');
  }
  const db = supabase as any;
  const mutedProfileIds = context.isCommissionerReview
    ? new Set<string>()
    : await getMutedProfileIds(supabase as any, context.profileId);
  const brandStyle = {
    '--clubhouse-accent': context.teamPrimaryColor,
    '--clubhouse-secondary': context.teamSecondaryColor,
  } as CSSProperties;

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
      .select('id,author_profile_id,title,body,post_type,pinned_at,created_at,updated_at')
      .eq('season_id', context.seasonId)
      .eq('team_id', context.teamId)
      .is('deleted_at', null)
      .order('pinned_at', {ascending: false, nullsFirst: false})
      .order('created_at', {ascending: false})
      .limit(100),
  ]);

  const teamMatchRows = (matches ?? []) as any[];
  const today = new Date().toISOString().slice(0, 10);
  const nextMatch = teamMatchRows.find((match) => match.date && match.date >= today && match.status !== 'Completed') ?? null;
  const teamIds = [...new Set(teamMatchRows.flatMap((match) => [match.home_team_id, match.away_team_id]).filter(Boolean))];
  const courseIds = [...new Set(teamMatchRows.map((match) => match.course_id).filter(Boolean))];
  const playerIds = (rosterRows ?? []).map((row: any) => row.player_id);
  const visiblePosts = (posts ?? []).filter((post: any) => !mutedProfileIds.has(post.author_profile_id));
  const postIds = visiblePosts.map((post: any) => post.id);
  const profileIds = visiblePosts.map((post: any) => post.author_profile_id);

  const [teamResult, courseResult, playerResult, attendanceResult, commentResult, reactionResult] = await Promise.all([
    teamIds.length ? db.from('launch_teams').select('id,name').in('id', teamIds) : Promise.resolve({data: []}),
    courseIds.length ? db.from('launch_courses').select('id,name').in('id', courseIds) : Promise.resolve({data: []}),
    playerIds.length ? db.from('launch_players').select('id,name').in('id', playerIds) : Promise.resolve({data: []}),
    nextMatch ? db.from('launch_match_attendance').select('player_id,status').eq('match_id', nextMatch.id).eq('team_id', context.teamId) : Promise.resolve({data: []}),
    postIds.length ? db.from('launch_clubhouse_comments').select('id,post_id,author_profile_id,parent_comment_id,body,created_at').in('post_id', postIds).is('deleted_at', null).order('created_at', {ascending: true}) : Promise.resolve({data: []}),
    postIds.length ? db.from('launch_clubhouse_post_reactions').select('post_id,profile_id,reaction_type').in('post_id', postIds) : Promise.resolve({data: []}),
  ]);

  const visibleComments = (commentResult.data ?? []).filter((comment: any) => !mutedProfileIds.has(comment.author_profile_id));

  const [{data: moderationEvents}, {data: reports}] = (context.isCaptain || context.isCommissioner)
    ? await Promise.all([
      db
        .from('launch_clubhouse_moderation_events')
        .select('id,content_type,content_id,content_author_profile_id,moderator_profile_id,reason,created_at')
        .eq('season_id', context.seasonId)
        .eq('team_id', context.teamId)
        .order('created_at', {ascending: false})
        .limit(20),
      db
        .from('launch_clubhouse_reports')
        .select('id,content_type,content_id,content_author_profile_id,reporter_profile_id,reason,note,status,created_at')
        .eq('season_id', context.seasonId)
        .eq('team_id', context.teamId)
        .order('created_at', {ascending: false})
        .limit(50),
    ])
    : [{data: []}, {data: []}];

  const commentAuthorIds = visibleComments.map((comment: any) => comment.author_profile_id);
  const moderationProfileIds = (moderationEvents ?? []).flatMap((event: any) => [
    event.content_author_profile_id,
    event.moderator_profile_id,
  ]).filter(Boolean);
  const reportProfileIds = (reports ?? []).flatMap((report: any) => [
    report.content_author_profile_id,
    report.reporter_profile_id,
  ]).filter(Boolean);
  const allProfileIds = [...new Set([...profileIds, ...commentAuthorIds, ...moderationProfileIds, ...reportProfileIds])];
  const {data: authorProfiles} = allProfileIds.length
    ? await db.from('launch_profiles').select('id,display_name').in('id', allProfileIds)
    : {data: []};

  const teams = new Map<string, string>((teamResult.data ?? []).map((row: any): [string, string] => [String(row.id), String(row.name)]));
  const courses = new Map<string, string>((courseResult.data ?? []).map((row: any): [string, string] => [String(row.id), String(row.name)]));
  const players = new Map<string, string>((playerResult.data ?? []).map((row: any): [string, string] => [String(row.id), String(row.name)]));
  const authors = new Map<string, string>((authorProfiles ?? []).map((row: any): [string, string] => [String(row.id), String(row.display_name)]));
  const attendance = new Map<string, string>((attendanceResult.data ?? []).map((row: any): [string, string] => [String(row.player_id), String(row.status)]));
  const openReports = (reports ?? []).filter((report: any) => report.status === 'Open');

  const going = playerIds.filter((id: string) => attendance.get(id) === 'Playing');
  const notGoing = playerIds.filter((id: string) => attendance.get(id) === 'NotPlaying');
  const undecided = playerIds.filter((id: string) => !attendance.has(id));
  const ownStatus = attendance.get(context.playerId) ?? 'Unconfirmed';
  const activityTimes = [
    ...visiblePosts.map((post: any) => String(post.created_at)),
    ...visibleComments.map((comment: any) => String(comment.created_at)),
  ].filter(Boolean);
  const readThrough = activityTimes.length
    ? activityTimes.reduce((latest, value) => value > latest ? value : latest)
    : new Date().toISOString();

  return (
    <main>
      <SiteHeader />
      {!context.isCommissionerReview ? (
        <ClubhouseReadMarker
          profileId={context.profileId}
          seasonId={context.seasonId}
          teamId={context.teamId}
          readThrough={readThrough}
        />
      ) : null}
      <section className={styles.page} style={brandStyle}>
        <div className="shell">
          <header className={styles.hero}>
            <div>
              <span className={styles.kicker}>{context.isCommissionerReview ? 'Commissioner review' : 'Private team space'} · {context.seasonName}</span>
              <h1><span>{context.teamName}</span> Clubhouse</h1>
              <p>{context.isCommissionerReview ? 'Commissioner moderation view of this team’s Clubhouse.' : 'Your team schedule, match availability, and private discussion in one place.'}</p>
            </div>
            <div className={styles.heroAside}>
              {context.teamLogo ? <div className={styles.logoWrap}><img src={context.teamLogo} alt={`${context.teamName} logo`} width={92} height={92} /></div> : null}
              <div className={styles.heroLinks}>
                <Link href={`/teams/${context.teamId}`}>Team home</Link>
                {!context.isCommissionerReview ? <Link href="/account/mutes">Muted members</Link> : null}
              </div>
            </div>
          </header>

          {context.isCommissionerReview ? (
            <p className={styles.notice}>Commissioner moderation mode · <Link href="/office/clubhouses">Back to Clubhouses</Link></p>
          ) : null}
          {notice ? <p className={styles.notice}>{notice}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}

          {nextMatch ? (
            <section className={styles.matchCard} style={{display:'block'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'20px',flexWrap:'wrap'}}>
                <div>
                  <span className={styles.kicker}>Next match</span>
                  <h2>{nextMatch.away_team_id === context.teamId ? `${context.teamName} @ ${teams.get(nextMatch.home_team_id) ?? 'Opponent'}` : `${teams.get(nextMatch.away_team_id) ?? 'Opponent'} @ ${context.teamName}`}</h2>
                  <p>{formatDate(nextMatch.date)} · {courses.get(nextMatch.course_id) ?? 'Location TBD'}</p>
                </div>
                <Link href={`/matches/${nextMatch.public_slug || nextMatch.id}`}>Open Matchday</Link>
              </div>

              <div style={{marginTop:'22px',paddingTop:'18px',borderTop:'1px solid rgba(255,255,255,.12)'}}>
                <span className={styles.kicker}>Roster status</span>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,minmax(0,1fr))',gap:'10px',marginTop:'10px'}}>
                  <div style={{padding:'10px 12px',border:'1px solid rgba(73,185,104,.45)',borderRadius:'7px',background:'rgba(73,185,104,.08)'}}>
                    <strong className={styles.green} style={{display:'block',fontSize:'24px',lineHeight:1}}>{going.length}</strong>
                    <span style={{color:'rgba(255,255,255,.72)',fontSize:'11px',fontWeight:900,textTransform:'uppercase'}}>Going</span>
                  </div>
                  <div style={{padding:'10px 12px',border:'1px solid rgba(217,91,91,.45)',borderRadius:'7px',background:'rgba(217,91,91,.08)'}}>
                    <strong className={styles.red} style={{display:'block',fontSize:'24px',lineHeight:1}}>{notGoing.length}</strong>
                    <span style={{color:'rgba(255,255,255,.72)',fontSize:'11px',fontWeight:900,textTransform:'uppercase'}}>Not going</span>
                  </div>
                  <div style={{padding:'10px 12px',border:'1px solid rgba(216,182,52,.45)',borderRadius:'7px',background:'rgba(216,182,52,.08)'}}>
                    <strong className={styles.yellow} style={{display:'block',fontSize:'24px',lineHeight:1}}>{undecided.length}</strong>
                    <span style={{color:'rgba(255,255,255,.72)',fontSize:'11px',fontWeight:900,textTransform:'uppercase'}}>Undecided</span>
                  </div>
                </div>

                <details className={styles.details}>
                  <summary style={{color:'#fff'}}>View players</summary>
                  <div className={styles.statusLists}>
                    <StatusList label="Going" tone="green" ids={going} players={players} />
                    <StatusList label="Not going" tone="red" ids={notGoing} players={players} />
                    <StatusList label="Undecided" tone="yellow" ids={undecided} players={players} />
                  </div>
                </details>

                {!context.isCommissionerReview ? (
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap',marginTop:'16px'}}>
                    <span style={{color:'rgba(255,255,255,.62)',fontSize:'11px',fontWeight:900,textTransform:'uppercase',letterSpacing:'.08em'}}>Your status</span>
                    <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                      {[
                        ['Playing','Going','green'],
                        ['NotPlaying','Not going','red'],
                        ['Unconfirmed','Undecided','yellow'],
                      ].map(([status,label,tone]) => (
                        <form action={setClubhouseAttendance} key={status} style={{margin:0}}>
                          <input type="hidden" name="matchId" value={nextMatch.id} />
                          <button
                            className={`${styles.rsvp} ${styles[tone]} ${ownStatus === status ? styles.selected : ''}`}
                            style={{width:'auto',minHeight:'32px',padding:'0 10px',fontSize:'10px',background:'rgba(255,255,255,.04)'}}
                            name="status"
                            value={status}
                          >{label}</button>
                        </form>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          <details className={`${styles.panel} ${styles.details} ${styles.schedulePanel}`}>
            <summary>Team schedule</summary>
            <div className={styles.schedule}>
              {teamMatchRows.map((match) => {
                const opponentId = match.home_team_id === context.teamId ? match.away_team_id : match.home_team_id;
                const side = match.home_team_id === context.teamId ? 'vs' : '@';
                return <Link href={`/matches/${match.public_slug || match.id}`} key={match.id}><strong>{formatDate(match.date)}</strong><span>{side} {teams.get(opponentId) ?? 'Opponent'}</span><small>{courses.get(match.course_id) ?? 'Location TBD'}</small></Link>;
              })}
            </div>
          </details>

          {!context.isCommissionerReview ? (
            <section className={styles.composer}>
              <div className={styles.composerHeader}>
                <h2>Team discussion</h2>
              </div>
              <form action={createClubhousePost}>
                {(context.isCaptain || context.isCommissioner) ? (
                  <label className={styles.announcementToggle}>
                    <input name="postType" type="checkbox" value="announcement" />
                    <span>Captain announcement</span>
                  </label>
                ) : null}
                <input name="title" maxLength={120} placeholder="Optional title" />
                <textarea name="body" maxLength={3000} rows={3} placeholder="Write something to your team" required />
                <button type="submit">Post</button>
              </form>
            </section>
          ) : null}

          <section className={styles.feed}>
            {visiblePosts.map((post: any) => {
              const comments = visibleComments.filter((comment: any) => comment.post_id === post.id);
              const reactions = (reactionResult.data ?? []).filter((reaction: any) => reaction.post_id === post.id);
              const isOwnPost = post.author_profile_id === context.profileId;
              const canManage = context.isCaptain || context.isCommissioner || isOwnPost;
              return (
                <article id={`post-${post.id}`} className={`${styles.post} ${post.pinned_at ? styles.pinned : ''}`} data-post-type={post.post_type} key={post.id}>
                  <div className={styles.postTop}>
                    <div><strong>{authors.get(post.author_profile_id) ?? 'Member'}</strong><span>{new Date(post.created_at).toLocaleString()}</span></div>
                    {post.post_type === 'announcement' ? <b>Captain announcement</b> : post.pinned_at ? <b>Pinned</b> : null}
                  </div>
                  {post.title ? <h3>{post.title}</h3> : null}
                  <p>{post.body}</p>
                  <div className={styles.postTools}>
                    {context.isCommissionerReview ? REACTIONS.map(([key,icon]) => {
                      const count = reactions.filter((reaction: any) => reaction.reaction_type === key).length;
                      return count ? <span key={key}>{icon} {count}</span> : null;
                    }) : REACTIONS.map(([key,icon]) => {
                      const count = reactions.filter((reaction: any) => reaction.reaction_type === key).length;
                      const active = reactions.some((reaction: any) => reaction.reaction_type === key && reaction.profile_id === context.profileId);
                      return <form action={reactToClubhousePost} key={key}><input type="hidden" name="postId" value={post.id}/><button data-active={active} name="reactionType" value={key}>{icon}{count ? ` ${count}` : ''}</button></form>;
                    })}
                    {(context.isCaptain || context.isCommissioner) ? <form action={toggleClubhousePin}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="teamId" value={context.teamId}/><input type="hidden" name="pinned" value={post.pinned_at ? 'true' : 'false'}/><button>{post.pinned_at ? 'Unpin' : 'Pin'}</button></form> : null}
                    {isOwnPost ? (
                      <EditPostControl post={post} teamId={context.teamId} />
                    ) : (
                      <>
                        {!context.isCommissionerReview ? <ReportControl kind="post" id={post.id} teamId={context.teamId} /> : null}
                        <MuteMemberControl
                          profileId={post.author_profile_id}
                          returnTo={`/clubhouse#post-${post.id}`}
                          compact
                        />
                      </>
                    )}
                    {canManage ? (
                      <RemovalControl
                        kind="post"
                        id={post.id}
                        teamId={context.teamId}
                        isOwn={isOwnPost}
                      />
                    ) : null}
                  </div>
                  <div className={styles.comments}>
                    {comments.filter((comment: any) => !comment.parent_comment_id).map((comment: any) => {
                      const isOwnComment = comment.author_profile_id === context.profileId;
                      const canManageComment = context.isCaptain || context.isCommissioner || isOwnComment;
                      return (
                        <div className={styles.comment} key={comment.id}>
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px'}}>
                            <strong>{authors.get(comment.author_profile_id) ?? 'Member'}</strong>
                            <span style={{display:'flex',alignItems:'center',gap:'6px'}}>
                              {isOwnComment ? <EditCommentControl comment={comment} teamId={context.teamId} /> : !context.isCommissionerReview ? <ReportControl kind="comment" id={comment.id} teamId={context.teamId} compact /> : null}
                              {!isOwnComment ? <MuteMemberControl profileId={comment.author_profile_id} returnTo={`/clubhouse#post-${post.id}`} compact /> : null}
                              {canManageComment ? <RemovalControl kind="comment" id={comment.id} teamId={context.teamId} isOwn={isOwnComment} compact /> : null}
                            </span>
                          </div>
                          <p>{comment.body}</p>
                          {comments.filter((reply: any) => reply.parent_comment_id === comment.id).map((reply: any) => {
                            const isOwnReply = reply.author_profile_id === context.profileId;
                            const canManageReply = context.isCaptain || context.isCommissioner || isOwnReply;
                            return (
                              <div className={styles.reply} key={reply.id}>
                                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'10px'}}>
                                  <strong>{authors.get(reply.author_profile_id) ?? 'Member'}</strong>
                                  <span style={{display:'flex',alignItems:'center',gap:'6px'}}>
                                    {isOwnReply ? <EditCommentControl comment={reply} teamId={context.teamId} /> : !context.isCommissionerReview ? <ReportControl kind="comment" id={reply.id} teamId={context.teamId} compact /> : null}
                                    {!isOwnReply ? <MuteMemberControl profileId={reply.author_profile_id} returnTo={`/clubhouse#post-${post.id}`} compact /> : null}
                                    {canManageReply ? <RemovalControl kind="comment" id={reply.id} teamId={context.teamId} isOwn={isOwnReply} compact /> : null}
                                  </span>
                                </div>
                                <span>{reply.body}</span>
                              </div>
                            );
                          })}
                          {!context.isCommissionerReview ? <form action={addClubhouseComment} className={styles.replyForm}><input type="hidden" name="postId" value={post.id}/><input type="hidden" name="parentCommentId" value={comment.id}/><input name="body" maxLength={1500} placeholder="Reply" required/><button>Reply</button></form> : null}
                        </div>
                      );
                    })}
                    {!context.isCommissionerReview ? <form action={addClubhouseComment} className={styles.commentForm}><input type="hidden" name="postId" value={post.id}/><input name="body" maxLength={1500} placeholder="Add a comment" required/><button>Comment</button></form> : null}
                  </div>
                </article>
              );
            })}
            {!visiblePosts.length ? <p className={styles.emptyInline}>No posts yet.</p> : null}
          </section>

          {(context.isCaptain || context.isCommissioner) ? (
            <details className={styles.moderationPanel} open={openReports.length > 0}>
              <summary className={styles.moderationSummary}>
                <span>Moderation</span>
                <strong>{openReports.length} {openReports.length === 1 ? 'report' : 'reports'}</strong>
              </summary>

              <div className={styles.moderationStack}>
                {openReports.length ? (
                  <div className={styles.moderationList}>
                    {openReports.map((report: any) => (
                      <article className={styles.reportCard} key={report.id}>
                        <div>
                          <strong>{report.content_type === 'post' ? 'Post' : 'Comment'} · {report.reason}</strong>
                          <span>{authors.get(report.reporter_profile_id) ?? 'Member'} reported content by {authors.get(report.content_author_profile_id) ?? 'Member'} · {new Date(report.created_at).toLocaleString()}</span>
                          {report.note ? <p>{report.note}</p> : null}
                        </div>
                        <form action={resolveClubhouseReport} className={styles.reportActions}>
                          <input type="hidden" name="reportId" value={report.id} />
                          <input type="hidden" name="teamId" value={context.teamId} />
                          <button name="status" value="Reviewed">Reviewed</button>
                          <button name="status" value="Dismissed">Dismiss</button>
                        </form>
                      </article>
                    ))}
                  </div>
                ) : <p className={styles.moderationQuiet}>Nothing needs attention.</p>}

                <details className={styles.details}>
                  <summary>Removal history</summary>
                  {(moderationEvents ?? []).length ? (
                    <div className={styles.moderationList}>
                      {(moderationEvents ?? []).map((event: any) => (
                        <div className={styles.auditRow} key={event.id}>
                          <strong>{event.content_type === 'post' ? 'Post' : 'Comment'} removed · {event.reason}</strong>
                          <span>{authors.get(event.content_author_profile_id) ?? 'Member'} · by {authors.get(event.moderator_profile_id) ?? 'Moderator'} · {new Date(event.created_at).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className={styles.moderationQuiet}>No removals logged.</p>}
                </details>
              </div>
            </details>
          ) : null}
        </div>
      </section>
      <Footer />
    </main>
  );
}

function RemovalControl({kind, id, teamId, isOwn, compact = false}: {
  kind: 'post' | 'comment';
  id: string;
  teamId: string;
  isOwn: boolean;
  compact?: boolean;
}) {
  const action = kind === 'post' ? deleteClubhousePost : removeClubhouseComment;
  const field = kind === 'post' ? 'postId' : 'commentId';

  if (isOwn) {
    return (
      <form action={action} style={{margin:0}}>
        <input type="hidden" name={field} value={id} />
        <input type="hidden" name="teamId" value={teamId} />
        <button type="submit" style={compact ? {padding:'3px 7px',fontSize:'9px'} : undefined}>Delete</button>
      </form>
    );
  }

  return (
    <details style={{position:'relative'}}>
      <summary style={{cursor:'pointer',fontSize:compact ? '9px' : '10px',fontWeight:900,textTransform:'uppercase'}}>Moderate</summary>
      <form
        action={action}
        style={{
          position:'absolute',
          right:0,
          zIndex:20,
          width:'180px',
          padding:'10px',
          display:'grid',
          gap:'7px',
          border:'1px solid rgba(127,127,127,.35)',
          borderRadius:'8px',
          background:'#111617',
          boxShadow:'0 12px 28px rgba(0,0,0,.28)',
        }}
      >
        <input type="hidden" name={field} value={id} />
        <input type="hidden" name="teamId" value={teamId} />
        <select name="reason" defaultValue="Inappropriate" aria-label="Removal reason">
          <option>Spam</option>
          <option>Harassment</option>
          <option>Inappropriate</option>
          <option>Off-topic</option>
          <option>Other</option>
        </select>
        <button type="submit">Remove</button>
      </form>
    </details>
  );
}

function EditPostControl({post, teamId}: {post: any; teamId: string}) {
  return (
    <details className={styles.inlineControl}>
      <summary>Edit</summary>
      <form action={editClubhousePost} className={styles.inlineForm}>
        <input type="hidden" name="postId" value={post.id} />
        <input type="hidden" name="teamId" value={teamId} />
        <input name="title" maxLength={120} defaultValue={post.title ?? ''} placeholder="Optional title" />
        <textarea name="body" maxLength={3000} defaultValue={post.body} rows={4} required />
        <button type="submit">Save edit</button>
      </form>
    </details>
  );
}

function EditCommentControl({comment, teamId}: {comment: any; teamId: string}) {
  return (
    <details className={styles.inlineControl}>
      <summary>Edit</summary>
      <form action={editClubhouseComment} className={styles.inlineForm}>
        <input type="hidden" name="commentId" value={comment.id} />
        <input type="hidden" name="teamId" value={teamId} />
        <textarea name="body" maxLength={1500} defaultValue={comment.body} rows={3} required />
        <button type="submit">Save edit</button>
      </form>
    </details>
  );
}

function ReportControl({kind, id, teamId, compact = false}: {
  kind: 'post' | 'comment';
  id: string;
  teamId: string;
  compact?: boolean;
}) {
  return (
    <details className={styles.inlineControl}>
      <summary style={compact ? {fontSize:'9px'} : undefined}>Report</summary>
      <form action={reportClubhouseContent} className={styles.inlineForm}>
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="contentType" value={kind} />
        <input type="hidden" name="contentId" value={id} />
        <select name="reason" defaultValue="Inappropriate" aria-label="Report reason">
          <option>Spam</option>
          <option>Harassment</option>
          <option>Inappropriate</option>
          <option>Off-topic</option>
          <option>Other</option>
        </select>
        <input name="note" maxLength={500} placeholder="Optional note" />
        <button type="submit">Send report</button>
      </form>
    </details>
  );
}

function StatusList({label,tone,ids,players}: {label:string;tone:'green'|'red'|'yellow';ids:string[];players:Map<string,string>}) {
  return <div className={styles.statusGroup}><h3 className={styles[tone]}>{label} · {ids.length}</h3>{ids.length ? ids.map((id) => <span key={id}>{players.get(id) ?? 'Player'}</span>) : <span>None</span>}</div>;
}
