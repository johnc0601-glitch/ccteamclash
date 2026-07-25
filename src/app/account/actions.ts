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
  const {error} = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/account`,
    },
  });

  if (error) redirect(`/account?error=${encodeURIComponent(error.message)}`);
  redirect('/account?notice=Check your email for the sign-in link.');
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
  if (!displayName) redirect('/account?error=Enter your name.');

  const {service, userId} = await getLaunchServiceForUser();
  const result = await service.createPendingProfile({userId, displayName});
  if (!result.ok) redirect(`/account?error=${encodeURIComponent(result.message)}`);

  revalidatePath('/account');
  redirect('/account?notice=Your league profile is ready for commissioner review.');
}

export async function submitPlayerClaim(formData: FormData) {
  const submittedName = readFormValue(formData, 'submittedName');
  const submittedPdgaNumber = readFormValue(formData, 'submittedPdgaNumber');
  const requestedPlayerId = readFormValue(formData, 'requestedPlayerId') || null;
  if (!submittedName) redirect('/account?error=Enter the player name to claim.');

  const {repository, service, userId} = await getLaunchServiceForUser();
  const profile = await repository.getProfileByUserId(userId);
  if (!profile) redirect('/account?error=Create your league profile first.');

  const result = await service.submitPlayerClaim({
    profileId: profile.id,
    requestedPlayerId,
    submittedName,
    submittedPdgaNumber,
  });
  if (!result.ok) redirect(`/account?error=${encodeURIComponent(result.message)}`);

  revalidatePath('/account');
  redirect('/account?notice=Your player claim was sent to the commissioner.');
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
