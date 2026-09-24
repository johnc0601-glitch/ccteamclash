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
