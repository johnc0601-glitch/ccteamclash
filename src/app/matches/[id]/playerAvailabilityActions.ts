'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import type {AttendanceResult, PersonalAttendance} from '@/domain/match-roster/MatchAttendance';
import {PlayerAvailabilityService} from '@/domain/match-roster/PlayerAvailabilityService';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {createClient} from '@/lib/supabase/server';

export async function setOwnPlayerAvailability(formData: FormData) {
  const matchId = readFormValue(formData, 'matchId');
  const status = readFormValue(formData, 'status');
  if (!matchId) redirect('/schedule?error=Match is required.');

  const path = `/matches/${encodeURIComponent(matchId)}`;
  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) {
    redirect(`/account?error=${encodeURIComponent('Sign in to set your availability.')}`);
  }

  let result: AttendanceResult<PersonalAttendance>;
  try {
    const service = new PlayerAvailabilityService(new SeasonAwareMatchRosterRepository(supabase));
    result = await service.setOwnAttendance(user.id, matchId, status);
  } catch {
    redirect(`${path}?attendanceError=${encodeURIComponent('Availability could not be saved. Try again.')}`);
  }

  if (!result.ok) redirect(`${path}?attendanceError=${encodeURIComponent(result.message)}`);

  revalidatePath(path);
  redirect(`${path}?attendanceNotice=${encodeURIComponent('Your availability was saved.')}`);
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
