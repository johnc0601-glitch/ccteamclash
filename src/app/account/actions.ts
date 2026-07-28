'use server';

import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {revalidatePath} from 'next/cache';
import {ensureLaunchSignupProfile} from '@/domain/launch/LaunchAccountSetup';
import {LaunchService} from '@/domain/launch/LaunchService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export async function requestMagicLink(formData: FormData) {
  const email = readFormValue(formData, 'email');
  if (!email) redirect('/account?error=Enter your email address.');

  const supabase = await createClient();
  const origin = await getOrigin();
  const {error} = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
    },
  });

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
  const signupInput = {displayName};
  const origin = await getOrigin();
  const {data, error} = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
      data: signupInput,
    },
  });

  if (error) redirect(`/account/create?error=${encodeURIComponent(getAuthErrorMessage(error))}`);

  if (data.user && data.session) {
    const setupError = await ensureLaunchSignupProfile(supabase, data.user, signupInput);
    if (setupError) redirect(`/account/create?error=${encodeURIComponent(setupError)}`);
    revalidatePath('/account');
    redirect('/account?notice=Your account is ready. Connect your previous league history if you played before.');
  }

  redirect('/account?notice=Account created. Check your email to confirm it, then sign in.');
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
  const {error} = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/account/reset-password`,
  });

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
  if (userError || !data.user) {
    redirect('/account?error=Request a new password reset link before changing your password.');
  }

  const {error} = await supabase.auth.updateUser({password});
  if (error) redirect(`/account/reset-password?error=${encodeURIComponent(getAuthErrorMessage(error))}`);

  revalidatePath('/account');
  redirect('/account?notice=Password updated. You are signed in.');
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const origin = await getOrigin();
  const {data, error} = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback?next=/account`,
    },
  });

  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
  redirect('/account?error=Google sign-in did not return a redirect.');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/account?notice=You are signed out.');
}

export async function createPendingProfile(formData: FormData) {
  const displayName = readFormValue(formData, 'displayName');
  const requestedPlayerId = readFormValue(formData, 'requestedPlayerId');
  if (!displayName) redirect('/account?error=Enter your name.');
  if (!requestedPlayerId) redirect('/account?error=Choose the name you played under before.');

  const {repository, service, userId} = await getLaunchServiceForUser();
  const selectedPlayer = await repository.getPlayer(requestedPlayerId);
  if (!selectedPlayer) redirect('/account?error=Choose a valid previous league name.');

  const profileResult = await service.createPendingProfile({userId, displayName});
  if (!profileResult.ok) redirect(`/account?error=${encodeURIComponent(profileResult.message)}`);

  const claimResult = await service.submitPlayerClaim({
    profileId: profileResult.data.id,
    requestedPlayerId: selectedPlayer.id,
    submittedName: displayName,
    submittedPdgaNumber: selectedPlayer.pdgaNumber,
  });
  if (!claimResult.ok) redirect(`/account?error=${encodeURIComponent(claimResult.message)}`);

  revalidatePath('/account');
  redirect('/account?notice=Your league history connection is ready for commissioner approval.');
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

export async function submitPlayerClaim(formData: FormData) {
  const submittedName = readFormValue(formData, 'submittedName');
  const submittedPdgaNumber = readFormValue(formData, 'submittedPdgaNumber');
  const requestedPlayerId = readFormValue(formData, 'requestedPlayerId');
  if (!submittedName) redirect('/account?error=Enter the player name to claim.');
  if (!requestedPlayerId) redirect('/account?error=Choose the name you played under before.');

  const {repository, service, userId} = await getLaunchServiceForUser();
  const profile = await repository.getProfileByUserId(userId);
  if (!profile) redirect('/account?error=Create your league profile first.');
  const selectedPlayer = await repository.getPlayer(requestedPlayerId);
  if (!selectedPlayer) redirect('/account?error=Choose a valid previous league name.');

  const result = await service.submitPlayerClaim({
    profileId: profile.id,
    requestedPlayerId: selectedPlayer.id,
    submittedName,
    submittedPdgaNumber: submittedPdgaNumber || selectedPlayer.pdgaNumber,
  });
  if (!result.ok) redirect(`/account?error=${encodeURIComponent(result.message)}`);

  revalidatePath('/account');
  redirect('/account?notice=Your league history connection was sent to the commissioner.');
}

async function getLaunchServiceForUser() {
  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/account?error=Sign in first.');

  const repository = new SupabaseLaunchRepository(supabase);
  return {
    repository,
    service: new LaunchService(repository),
    userId: data.user.id,
  };
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

function getAuthErrorMessage(error: {message?: string; code?: string; status?: number}): string {
  const message = error.message?.trim();
  if (message === 'Invalid login credentials') return 'Email or password is wrong. Use password reset if needed.';
  if (message && message !== '{}') return message;
  if (error.code === 'over_email_send_rate_limit') return 'Email rate limit exceeded. Wait a few minutes before requesting another sign-in link.';
  return 'The sign-in email could not be sent. Check the Supabase email sender settings.';
}
