import Link from 'next/link';
import {redirect} from 'next/navigation';
import {OfficePage} from '@/components/commissioner/OfficePage';
import {createClient} from '@/lib/supabase/server';
import {reviewMatchFeedReport} from './actions';

type ReportRow = {
  id: string;
  match_id: string;
  post_id: string | null;
  comment_id: string | null;
  reporter_profile_id: string;
  reason: string;
  note: string;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by_profile_id: string | null;
  resolution_note: string;
};

type PostRow = {id: string; author_name_snapshot: string | null; body: string; deleted_at: string | null};
type CommentRow = {id: string; post_id: string; author_name_snapshot: string | null; body: string; deleted_at: string | null};
type ProfileRow = {id: string; display_name: string | null};

export default async function ModerationPage({searchParams}: {searchParams?: Promise<{notice?: string; error?: string}>}) {
  const params = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) redirect('/account');
  const {data: profile} = await supabase.from('launch_profiles').select('id,role,status').eq('user_id', user.id).maybeSingle();
  if (!profile || profile.role !== 'Commissioner' || profile.status !== 'Approved') redirect('/account');

  const db = supabase as any;
  const {data: reportData, error} = await db
    .from('launch_match_feed_reports')
    .select('id,match_id,post_id,comment_id,reporter_profile_id,reason,note,status,created_at,reviewed_at,reviewed_by_profile_id,resolution_note')
    .order('created_at', {ascending: false})
    .limit(100);

  const reports = (reportData ?? []) as ReportRow[];
  const postIds = [...new Set(reports.map((report) => report.post_id).filter((value): value is string => Boolean(value)))];
  const commentIds = [...new Set(reports.map((report) => report.comment_id).filter((value): value is string => Boolean(value)))];
  const profileIds = [...new Set(reports.flatMap((report) => [report.reporter_profile_id, report.reviewed_by_profile_id]).filter((value): value is string => Boolean(value)))];

  const [{data: postsData}, {data: commentsData}, {data: profilesData}] = await Promise.all([
    postIds.length ? db.from('launch_match_feed_posts').select('id,author_name_snapshot,body,deleted_at').in('id', postIds) : Promise.resolve({data: []}),
    commentIds.length ? db.from('launch_match_feed_comments').select('id,post_id,author_name_snapshot,body,deleted_at').in('id', commentIds) : Promise.resolve({data: []}),
    profileIds.length ? db.from('launch_profiles').select('id,display_name').in('id', profileIds) : Promise.resolve({data: []}),
  ]);

  const posts = new Map(((postsData ?? []) as PostRow[]).map((row) => [row.id, row]));
  const comments = new Map(((commentsData ?? []) as CommentRow[]).map((row) => [row.id, row]));
  const profiles = new Map(((profilesData ?? []) as ProfileRow[]).map((row) => [row.id, row]));
  const pending = reports.filter((report) => report.status === 'Pending');
  const reviewed = reports.filter((report) => report.status !== 'Pending');

  return (
    <OfficePage sectionId="media">
      <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 18}}>
        <div>
          <h1 style={{margin: 0}}>Matchday moderation</h1>
          <p style={{margin: '6px 0 0'}}>Member reports from Matchday posts and comments.</p>
        </div>
        <Link href="/office/media">Back to Media</Link>
      </div>

      {params.notice ? <p style={noticeStyle}>{params.notice}</p> : null}
      {params.error || error ? <p style={errorStyle}>{params.error || 'Moderation queue could not load.'}</p> : null}

      <section style={{marginBottom: 28}}>
        <h2>Pending · {pending.length}</h2>
        {!pending.length ? <p>No pending reports.</p> : null}
        <div style={{display: 'grid', gap: 12}}>
          {pending.map((report) => <ReportCard key={report.id} report={report} posts={posts} comments={comments} profiles={profiles} />)}
        </div>
      </section>

      <section>
        <h2>Recently reviewed · {reviewed.length}</h2>
        {!reviewed.length ? <p>No reviewed reports yet.</p> : null}
        <div style={{display: 'grid', gap: 10}}>
          {reviewed.map((report) => <ReportCard key={report.id} report={report} posts={posts} comments={comments} profiles={profiles} readOnly />)}
        </div>
      </section>
    </OfficePage>
  );
}

function ReportCard({report, posts, comments, profiles, readOnly = false}: {
  report: ReportRow;
  posts: Map<string, PostRow>;
  comments: Map<string, CommentRow>;
  profiles: Map<string, ProfileRow>;
  readOnly?: boolean;
}) {
  const post = report.post_id ? posts.get(report.post_id) : undefined;
  const comment = report.comment_id ? comments.get(report.comment_id) : undefined;
  const anchorPostId = post?.id ?? comment?.post_id;
  const contentAuthor = post?.author_name_snapshot ?? comment?.author_name_snapshot ?? 'Unknown member';
  const body = post?.body ?? comment?.body ?? 'Content is no longer available.';
  const deleted = Boolean(post?.deleted_at ?? comment?.deleted_at);
  const reporter = profiles.get(report.reporter_profile_id)?.display_name || 'Member';
  const reviewer = report.reviewed_by_profile_id ? profiles.get(report.reviewed_by_profile_id)?.display_name || 'Commissioner' : null;

  return (
    <article style={{border: '1px solid rgba(127,127,127,.35)', borderRadius: 12, padding: 14}}>
      <div style={{display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap'}}>
        <div>
          <strong>{report.reason}</strong> · {report.post_id ? 'Post' : 'Comment'} · {report.status}
          <div style={{fontSize: 12, opacity: .72, marginTop: 4}}>Reported by {reporter} · {formatDate(report.created_at)}</div>
        </div>
        {anchorPostId ? <Link href={`/matches/${encodeURIComponent(report.match_id)}#post-${anchorPostId}`}>Open Matchday item</Link> : null}
      </div>

      <div style={{marginTop: 12, padding: 12, borderRadius: 8, background: 'rgba(127,127,127,.08)'}}>
        <strong>{contentAuthor}</strong>{deleted ? ' · Removed' : ''}
        <p style={{margin: '6px 0 0', whiteSpace: 'pre-wrap'}}>{body || '(photo-only post)'}</p>
      </div>

      {report.note ? <p style={{margin: '10px 0 0'}}><strong>Reporter note:</strong> {report.note}</p> : null}

      {readOnly ? (
        <div style={{fontSize: 13, opacity: .8, marginTop: 10}}>
          {reviewer ? `Reviewed by ${reviewer}` : 'Reviewed'}{report.reviewed_at ? ` · ${formatDate(report.reviewed_at)}` : ''}{report.resolution_note ? ` · ${report.resolution_note}` : ''}
        </div>
      ) : (
        <form action={reviewMatchFeedReport} style={{display: 'grid', gap: 8, marginTop: 12}}>
          <input type="hidden" name="reportId" value={report.id} />
          <input name="resolutionNote" maxLength={500} placeholder="Optional commissioner note" />
          <div style={{display: 'flex', gap: 8, flexWrap: 'wrap'}}>
            <button type="submit" name="status" value="Resolved">Resolve</button>
            <button type="submit" name="status" value="Dismissed">Dismiss</button>
          </div>
        </form>
      )}
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'}).format(new Date(value));
}

const noticeStyle = {padding: 10, borderRadius: 8, border: '1px solid rgba(90,180,120,.45)'} as const;
const errorStyle = {padding: 10, borderRadius: 8, border: '1px solid rgba(210,90,90,.5)'} as const;
