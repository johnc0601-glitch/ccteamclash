import 'server-only';

import {createAdminClient} from '@/lib/supabase/admin';

type CaptainAnnouncementNotificationInput = {
  seasonId: string;
  teamId: string;
  teamName: string;
  postId: string;
  title: string;
  body: string;
  authorProfileId: string;
};

export async function enqueueCaptainAnnouncementNotifications(
  input: CaptainAnnouncementNotificationInput,
) {
  const admin = createAdminClient() as any;

  const {data: rosterRows, error: rosterError} = await admin
    .from('launch_season_roster_memberships')
    .select('player_id')
    .eq('season_id', input.seasonId)
    .eq('team_id', input.teamId)
    .eq('status', 'Active');

  if (rosterError) throw rosterError;

  const playerIds = [...new Set((rosterRows ?? []).map((row: {player_id: string}) => row.player_id))];
  if (!playerIds.length) return 0;

  const {data: profileRows, error: profileError} = await admin
    .from('launch_profiles')
    .select('id,player_id,status,user_id')
    .in('player_id', playerIds)
    .eq('status', 'Approved')
    .not('user_id', 'is', null);

  if (profileError) throw profileError;

  const candidateProfileIds: string[] = (profileRows ?? [])
    .map((row: {id: string}) => row.id)
    .filter((id: string) => id !== input.authorProfileId);
  if (!candidateProfileIds.length) return 0;

  const [{data: subscriptions, error: subscriptionError}, {data: preferences, error: preferenceError}] = await Promise.all([
    admin
      .from('launch_push_subscriptions')
      .select('profile_id')
      .in('profile_id', candidateProfileIds)
      .eq('enabled', true),
    admin
      .from('launch_notification_preferences')
      .select('profile_id,captain_announcements')
      .in('profile_id', candidateProfileIds),
  ]);

  if (subscriptionError) throw subscriptionError;
  if (preferenceError) throw preferenceError;

  const subscribed = new Set((subscriptions ?? []).map((row: {profile_id: string}) => row.profile_id));
  const preferenceMap = new Map(
    (preferences ?? []).map((row: {profile_id: string; captain_announcements: boolean}) => [
      row.profile_id,
      row.captain_announcements,
    ]),
  );

  const recipients: string[] = candidateProfileIds.filter((profileId: string) =>
    subscribed.has(profileId) && preferenceMap.get(profileId) !== false);
  if (!recipients.length) return 0;

  const announcementTitle = input.title.trim() || 'Captain announcement';
  const rows = recipients.map((profileId: string) => ({
    profile_id: profileId,
    category: 'captain_announcements',
    title: `${input.teamName}: ${announcementTitle}`.slice(0, 180),
    body: input.body.trim().slice(0, 500),
    url: `/clubhouse#post-${input.postId}`,
    source_type: 'clubhouse_post',
    source_id: input.postId,
  }));

  const {error} = await admin
    .from('launch_notification_outbox')
    .upsert(rows, {onConflict: 'profile_id,category,source_type,source_id', ignoreDuplicates: true});

  if (error) throw error;
  return rows.length;
}


export async function enqueuePublishedResultNotifications(matchId: string) {
  const admin = createAdminClient() as any;

  const {data: match, error: matchError} = await admin
    .from('launch_schedule_matches')
    .select('id,season_id,home_team_id,away_team_id,public_slug')
    .eq('id', matchId)
    .maybeSingle();
  if (matchError) throw matchError;
  if (!match) return 0;

  const [{data: result, error: resultError}, {data: teamRows, error: teamError}] = await Promise.all([
    admin
      .from('launch_match_results')
      .select('home_score,away_score,status,published_at')
      .eq('match_id', matchId)
      .eq('status', 'Published')
      .maybeSingle(),
    admin
      .from('launch_teams')
      .select('id,name,short_name')
      .in('id', [match.home_team_id, match.away_team_id]),
  ]);
  if (resultError) throw resultError;
  if (teamError) throw teamError;
  if (!result?.published_at) return 0;

  const teamNames = new Map<string, {name: string; shortName: string}>(
    (teamRows ?? []).map((row: {id: string; name: string; short_name: string}) => [
      row.id,
      {name: row.name, shortName: row.short_name},
    ]),
  );
  const home = teamNames.get(match.home_team_id);
  const away = teamNames.get(match.away_team_id);
  if (!home || !away) return 0;

  const {data: rosterRows, error: rosterError} = await admin
    .from('launch_season_roster_memberships')
    .select('player_id')
    .eq('season_id', match.season_id)
    .in('team_id', [match.home_team_id, match.away_team_id])
    .eq('status', 'Active');
  if (rosterError) throw rosterError;

  const playerIds: string[] = [...new Set(
    (rosterRows ?? []).map((row: {player_id: string}) => row.player_id),
  )];
  if (!playerIds.length) return 0;

  const {data: profileRows, error: profileError} = await admin
    .from('launch_profiles')
    .select('id,player_id,status,user_id')
    .in('player_id', playerIds)
    .eq('status', 'Approved')
    .not('user_id', 'is', null);
  if (profileError) throw profileError;

  const candidateProfileIds: string[] = (profileRows ?? []).map((row: {id: string}) => row.id);
  if (!candidateProfileIds.length) return 0;

  const [{data: subscriptions, error: subscriptionError}, {data: preferences, error: preferenceError}] = await Promise.all([
    admin
      .from('launch_push_subscriptions')
      .select('profile_id')
      .in('profile_id', candidateProfileIds)
      .eq('enabled', true),
    admin
      .from('launch_notification_preferences')
      .select('profile_id,results_ci')
      .in('profile_id', candidateProfileIds),
  ]);
  if (subscriptionError) throw subscriptionError;
  if (preferenceError) throw preferenceError;

  const subscribed = new Set<string>(
    (subscriptions ?? []).map((row: {profile_id: string}) => row.profile_id),
  );
  const preferenceMap = new Map<string, boolean>(
    (preferences ?? []).map((row: {profile_id: string; results_ci: boolean}) => [
      row.profile_id,
      row.results_ci,
    ]),
  );
  const recipients: string[] = candidateProfileIds.filter((profileId: string) =>
    subscribed.has(profileId) && preferenceMap.get(profileId) !== false);
  if (!recipients.length) return 0;

  const title = `Final: ${away.shortName} ${result.away_score} - ${result.home_score} ${home.shortName}`;
  const rows = recipients.map((profileId: string) => ({
    profile_id: profileId,
    category: 'results_ci',
    title: title.slice(0, 180),
    body: 'Official Team Clash results and Clash Index updates are available.',
    url: `/matches/${match.public_slug || match.id}`,
    source_type: 'match_result',
    source_id: match.id,
  }));

  const {error} = await admin
    .from('launch_notification_outbox')
    .upsert(rows, {
      onConflict: 'profile_id,category,source_type,source_id',
      ignoreDuplicates: true,
    });
  if (error) throw error;
  return rows.length;
}
