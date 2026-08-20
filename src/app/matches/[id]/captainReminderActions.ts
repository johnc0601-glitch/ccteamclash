'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {buildCaptainReminderMessage, buildCaptainReminderRecipients} from '@/domain/match-roster/CaptainReminderEmail';
import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import {isPlayerAttendanceOpen} from '@/domain/match-roster/MatchRosterLock';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {SupabaseMatchRosterRepository} from '@/domain/match-roster/SupabaseMatchRosterRepository';
import {sendReminderBatch} from '@/lib/email/resend';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';

export async function emailCaptainUnconfirmed(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  if (!matchId) redirect('/schedule?error=Match is required.');

  const path = `/matches/${encodeURIComponent(matchId)}?manage=roster`;
  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) redirect(`/account?error=${encodeURIComponent('Sign in with an approved captain account.')}`);

  const attendanceRepository = new SupabaseMatchRosterRepository(supabase);
  const [actor, match] = await Promise.all([
    attendanceRepository.getAttendanceActor(user.id),
    attendanceRepository.getAttendanceMatch(matchId),
  ]);
  if (
    !actor
    || actor.profileStatus !== 'Approved'
    || actor.profileRole !== 'Captain'
    || !actor.captainTeamId
    || !match
    || !isPlayerAttendanceOpen(match)
  ) {
    redirect(`${path}&captainError=${encodeURIComponent('Unconfirmed reminders are not available for this match.')}`);
  }

  const service = new MatchRosterService(new SeasonAwareMatchRosterRepository(supabase));
  const managedRosters = await service.getManagedTeamRosters(user.id, matchId);
  const roster = managedRosters.find((item) => item.teamId === actor.captainTeamId);
  if (!roster?.attendanceOpen) {
    redirect(`${path}&captainError=${encodeURIComponent('Unconfirmed reminders are not available yet.')}`);
  }

  const unconfirmed = roster.players.filter((player) => player.status === 'Unconfirmed');
  if (!unconfirmed.length) {
    redirect(`${path}&captainNotice=${encodeURIComponent('No unconfirmed players remain.')}`);
  }

  const {data: reminderAllowed, error: reminderLimitError} = await (supabase as any).rpc(
    'claim_captain_reminder_send',
    {target_match_id: matchId},
  );
  if (reminderLimitError) {
    console.error('Captain reminder rate-limit check failed.', {
      matchId,
      captainTeamId: actor.captainTeamId,
      errorClass: reminderLimitError.code ?? 'UnknownError',
    });
    redirect(`${path}&captainError=${encodeURIComponent('Reminder sending is temporarily unavailable.')}`);
  }
  if (!reminderAllowed) {
    redirect(`${path}&captainError=${encodeURIComponent('Reminder limit reached for this match. Try again later.')}`);
  }

  try {
    const admin = createAdminClient();
    const adminDb = admin as any;
    const playerIds = unconfirmed.map((player) => player.playerId);
    const {data: profiles, error: profileError} = await adminDb
      .from('launch_profiles')
      .select('player_id,user_id')
      .eq('status', 'Approved')
      .in('player_id', playerIds);
    if (profileError) throw profileError;

    const emailEntries = await Promise.all((profiles ?? []).map(async (profile: {player_id: string | null; user_id: string}) => {
      if (!profile.player_id) return undefined;
      const {data, error} = await admin.auth.admin.getUserById(profile.user_id);
      if (error || !data.user?.email) return undefined;
      return [profile.player_id, data.user.email] as const;
    }));
    const emailByPlayerId = new Map<string, string>(
      emailEntries.filter((entry): entry is readonly [string, string] => Boolean(entry)),
    );
    const recipients = buildCaptainReminderRecipients(roster.players, emailByPlayerId);
    if (!recipients.length) {
      redirect(`${path}&captainError=${encodeURIComponent('None of the unconfirmed players have a linked email account.')}`);
    }

    const teamIds = [match.awayTeamId, match.homeTeamId].filter((id): id is string => Boolean(id));
    const {data: teams, error: teamError} = await adminDb
      .from('launch_teams')
      .select('id,name')
      .in('id', teamIds);
    if (teamError) throw teamError;
    const teamNames = new Map<string, string>(
      (teams ?? []).map((team: {id: string; name: string}) => [team.id, team.name] as const),
    );
    const awayTeamName = match.awayTeamId ? teamNames.get(match.awayTeamId) : undefined;
    const homeTeamName = match.homeTeamId ? teamNames.get(match.homeTeamId) : undefined;
    if (!awayTeamName || !homeTeamName || !match.date) throw new Error('Match reminder details are incomplete.');

    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://ccteamclash.com').replace(/\/$/, '');
    const message = buildCaptainReminderMessage({
      awayTeamName,
      homeTeamName,
      matchDateLabel: formatMatchDate(match.date),
      matchUrl: `${siteUrl}/matches/${encodeURIComponent(matchId)}`,
    });

    await sendReminderBatch(recipients.map((recipient) => ({
      to: recipient.email,
      ...message,
      tags: [
        {name: 'type', value: 'match_availability'},
        {name: 'team', value: roster.teamId.slice(0, 200)},
      ],
    })));

    revalidatePath(`/matches/${matchId}`);
    const missingCount = unconfirmed.length - recipients.length;
    const notice = missingCount > 0
      ? `Reminder sent to ${recipients.length} unconfirmed player${recipients.length === 1 ? '' : 's'}. ${missingCount} player${missingCount === 1 ? '' : 's'} had no linked email.`
      : `Reminder sent to ${recipients.length} unconfirmed player${recipients.length === 1 ? '' : 's'}.`;
    redirect(`${path}&captainNotice=${encodeURIComponent(notice)}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    console.error('Captain unconfirmed reminder failed.', {
      matchId,
      captainTeamId: actor.captainTeamId,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
    redirect(`${path}&captainError=${encodeURIComponent('Unconfirmed reminders could not be sent.')}`);
  }
}

function formatMatchDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function isRedirectError(error: unknown): boolean {
  return Boolean(
    error
    && typeof error === 'object'
    && 'digest' in error
    && typeof (error as {digest?: unknown}).digest === 'string'
    && (error as {digest: string}).digest.startsWith('NEXT_REDIRECT'),
  );
}
