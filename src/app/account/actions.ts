'use server';

import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {LaunchService} from '@/domain/launch/LaunchService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export async function requestMagicLink(formData: FormData) {
  const email = readFormValue(formData, 'email');
  if (!email) redirect('/account?error=Enter your email address.');
  const supabase = await createClient();
  const origin = await getOrigin();
  const {error} = await supabase.auth.signInWithOtp({email, options: {emailRedirectTo: `${origin}/auth/callback?flow=magic-link&next=/`}});
  if (error) redirect(`/account?error=${encodeURIComponent(getAuthErrorMessage(error))}`);
  redirect('/account?notice=Check your email for the sign-in link.');
}

export async function createLeagueAccount(formData: FormData) {
  const email = readFormValue(formData, 'email');
  const password = readFormValue(formData, 'password');
  const confirmPassword = readFormValue(formData, 'confirmPassword');
  const displayName = readFormValue(formData, 'displayName');

  if (!displayName) redirect('/account/create?error=Enter your name.');
  if (!email) redirect('/account/create?error=Enter your email address.');
  if (password.length < 8) redirect('/account/create?error=Password must be at least 8 characters.');
  if (password !== confirmPassword) redirect('/account/create?error=Passwords do not match.');

  const supabase = await createClient();
  const origin = await getOrigin();
  const {data, error} = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?flow=signup-confirm&next=/`,
      data: {displayName},
    },
  });

  if (error) redirect(`/account/create?error=${encodeURIComponent(getAuthErrorMessage(error))}`);
  if (data.user && data.session) {
    revalidatePath('/account');
    redirect('/account?notice=Account created. Complete your one-time Player Setup, then register for the season.');
  }
  redirect('/account?notice=Account created. Confirm your email, then complete Player Setup and season registration.');
}

export async function completePlayerSetup(formData: FormData) {
  const playedBefore = readPlayedBefore(readFormValue(formData, 'playedBefore'));
  const requestedPlayerId = readFormValue(formData, 'requestedPlayerId');
  if (playedBefore === null) redirect('/account?error=Choose whether you have played Coastal Clash before.');
  if (playedBefore && !requestedPlayerId) redirect('/account?error=Choose the player record you used before.');

  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) redirect('/account?error=Sign in first.');

  const {error} = await supabase.rpc('complete_launch_player_setup' as never, {
    target_played_before: playedBefore,
    target_player_id: playedBefore ? requestedPlayerId : null,
  } as never);
  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/account');
  revalidatePath('/players');
  revalidatePath('/office/players');
  redirect(`/account?notice=${encodeURIComponent(playedBefore ? 'Player Setup complete. Your previous Coastal Clash history is connected.' : 'Player Setup complete. Your new Coastal Clash player record is ready.')}`);
}

export async function submitSeasonApplication(formData: FormData) {
  const seasonId = readFormValue(formData, 'seasonId');
  const requestedTeamId = readFormValue(formData, 'requestedTeamId');
  let playerType = readPlayerType(readFormValue(formData, 'playerType'));
  let gender = readApplicationGender(readFormValue(formData, 'gender'));
  if (!seasonId || !requestedTeamId) redirect('/account?error=Complete all season registration fields.');

  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) redirect('/account?error=Sign in first.');

  const launchSupabase = supabase as any;
  const {data: profile, error: profileError} = await launchSupabase
    .from('launch_profiles')
    .select('id, played_before, player_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (profileError) redirect(`/account?error=${encodeURIComponent(profileError.message)}`);
  if (!profile?.player_id || typeof profile.played_before !== 'boolean') {
    redirect('/account?error=Finish your one-time Player Setup before registering for the season.');
  }

  const [{data: priorApplication}, {data: playerRow}] = await Promise.all([
    launchSupabase
      .from('launch_player_applications')
      .select('player_type, gender, created_at')
      .eq('profile_id', profile.id)
      .eq('status', 'Approved')
      .neq('season_id', seasonId)
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle(),
    launchSupabase
      .from('launch_players')
      .select('gender')
      .eq('id', profile.player_id)
      .maybeSingle(),
  ]);

  const establishedPlayerType = readPlayerType(priorApplication?.player_type ?? '');
  const establishedGender = readApplicationGender(playerRow?.gender ?? '')
    ?? readApplicationGender(priorApplication?.gender ?? '');

  if (establishedPlayerType && establishedGender) {
    playerType = establishedPlayerType;
    gender = establishedGender;
  }

  if (!playerType || !gender) redirect('/account?error=Complete all season registration fields.');

  const {error} = await supabase.rpc('submit_launch_player_application' as never, {
    target_season_id: seasonId,
    target_requested_team_id: requestedTeamId,
    target_player_type: playerType,
    target_gender: gender,
    target_played_before: profile.played_before,
  } as never);
  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/account');
  revalidatePath('/captain');
  revalidatePath('/office/players');
  revalidatePath('/players');
  redirect('/account?notice=Season registration submitted. Your selected team captain must approve it before you are added to the roster.');
}

export async function signInWithPassword(formData: FormData) {
  const email = readFormValue(formData, 'email');
  const password = readFormValue(formData, 'password');
  if (!email) redirect('/account?error=Enter your email address.');
  if (!password) redirect('/account?error=Enter your password.');
  const supabase = await createClient();
  const {error} = await supabase.auth.signInWithPassword({email, password});
  if (error) redirect(`/account?error=${encodeURIComponent(getAuthErrorMessage(error))}`);
  revalidatePath('/account');
  redirect('/account?notice=You are signed in.');
}

export async function requestPasswordReset(formData: FormData) {
  const email = readFormValue(formData, 'email');
  if (!email) redirect('/account/forgot-password?error=Enter your email address.');
  const supabase = await createClient();
  const origin = await getOrigin();
  const {error} = await supabase.auth.resetPasswordForEmail(email, {redirectTo: `${origin}/auth/callback?next=/account/reset-password`});
  if (error) redirect(`/account/forgot-password?error=${encodeURIComponent(getAuthErrorMessage(error))}`);
  redirect('/account/forgot-password?notice=If an account exists for that email, a reset link has been sent.');
}

export async function updatePassword(formData: FormData) {
  const password = readFormValue(formData, 'password');
  const confirmPassword = readFormValue(formData, 'confirmPassword');
  if (password.length < 8) redirect('/account/reset-password?error=Password must be at least 8 characters.');
  if (password !== confirmPassword) redirect('/account/reset-password?error=Passwords do not match.');
  const supabase = await createClient();
  const {data, error: userError} = await supabase.auth.getUser();
  if (userError || !data.user) redirect('/account?error=Request a new password reset link before changing your password.');
  const {error} = await supabase.auth.updateUser({password});
  if (error) redirect(`/account/reset-password?error=${encodeURIComponent(getAuthErrorMessage(error))}`);
  revalidatePath('/account');
  redirect('/account?notice=Password updated. You are signed in.');
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await getOrigin();
  const {data, error} = await supabase.auth.signInWithOAuth({provider: 'google', options: {redirectTo: `${origin}/auth/callback?next=/account`}});
  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
  redirect('/account?error=Google sign-in did not return a redirect.');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/account?notice=You are signed out.');
}

export async function updateProfileName(formData: FormData) {
  const displayName = readFormValue(formData, 'displayName');
  if (!displayName) redirect('/account?error=Enter your name.');
  const {service, userId} = await getLaunchServiceForUser();
  const result = await service.updateOwnProfileName(userId, displayName);
  if (!result.ok) redirect(`/account?error=${encodeURIComponent(result.message)}`);
  revalidatePath('/account');
  redirect('/account?notice=Your profile name was updated.');
}

async function getLaunchServiceForUser() {
  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/account?error=Sign in first.');
  const repository = new SupabaseLaunchRepository(supabase);
  return {repository, service: new LaunchService(repository), userId: data.user.id};
}

async function getOrigin(): Promise<string> {
  const headerStore = await headers();
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return configuredUrl;
  const origin = headerStore.get('origin');
  if (origin) return origin;
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host');
  const protocol = headerStore.get('x-forwarded-proto') ?? (host?.includes('localhost') ? 'http' : 'https');
  return host ? `${protocol}://${host}` : 'https://www.ccteamclash.com';
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
function readPlayerType(value: string): 'Adult' | 'Junior' | null { return value === 'Adult' || value === 'Junior' ? value : null; }
function readApplicationGender(value: string): 'Male' | 'Female' | null { return value === 'Male' || value === 'Female' ? value : null; }
function readPlayedBefore(value: string): boolean | null { if (value === 'true') return true; if (value === 'false') return false; return null; }
function getAuthErrorMessage(error: {message?: string; code?: string; status?: number}): string {
  const message = error.message?.trim();
  if (message === 'Invalid login credentials') return 'Email or password is wrong. Use password reset if needed.';
  if (message && message !== '{}') return message;
  if (error.code === 'over_email_send_rate_limit') return 'Email rate limit exceeded. Wait a few minutes before requesting another sign-in link.';
  return 'The sign-in email could not be sent. Check the Supabase email sender settings.';
}
