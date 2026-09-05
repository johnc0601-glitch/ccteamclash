'use server';

import {headers} from 'next/headers';
import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

type FreeAgencyClient = {
  rpc: (
    fn: 'submit_launch_free_agent_application',
    args: {
      target_season_id: string;
      target_player_type: 'Adult' | 'Junior';
      target_gender: 'Male' | 'Female';
      target_pdga_number: string;
      target_pdga_rating: number | null;
    },
  ) => Promise<{error: {message: string} | null}>;
};

export async function signInToFreeAgency(formData: FormData) {
  const email = readFormValue(formData, 'email');
  const password = readFormValue(formData, 'password');
  if (!email) redirect('/account/free-agency?error=Enter your email address.');
  if (!password) redirect('/account/free-agency?error=Enter your password.');

  const supabase = await createClient();
  const {error} = await supabase.auth.signInWithPassword({email, password});
  if (error) {
    if (isEmailNotConfirmed(error)) {
      redirect(`/account/check-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent('Your account exists, but your email has not been confirmed. Open the confirmation email we sent you before signing in.')}`);
    }
    redirect(`/account/free-agency?error=${encodeURIComponent(getAuthErrorMessage(error))}`);
  }

  revalidatePath('/account');
  revalidatePath('/account/free-agency');
  redirect('/account/free-agency?notice=You are signed in. Complete your Free Agent listing below.');
}

export async function createFreeAgencyAccount(formData: FormData) {
  const displayName = readFormValue(formData, 'displayName');
  const email = readFormValue(formData, 'email');
  const password = readFormValue(formData, 'password');
  const confirmPassword = readFormValue(formData, 'confirmPassword');

  if (!displayName) redirect('/account/free-agency?error=Enter your name.');
  if (!email) redirect('/account/free-agency?error=Enter your email address.');
  if (password.length < 8) redirect('/account/free-agency?error=Password must be at least 8 characters.');
  if (password !== confirmPassword) redirect('/account/free-agency?error=Passwords do not match.');

  const supabase = await createClient();
  const origin = await getOrigin();
  const {data, error} = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?flow=signup-confirm&next=/account/free-agency`,
      data: {displayName},
    },
  });

  if (error) redirect(`/account/free-agency?error=${encodeURIComponent(getAuthErrorMessage(error))}`);
  if (data.user && data.session) {
    revalidatePath('/account');
    revalidatePath('/account/free-agency');
    redirect('/account/free-agency?notice=Account created. Complete your Free Agent listing below.');
  }

  redirect(`/account/check-email?email=${encodeURIComponent(email)}`);
}

export async function joinFreeAgency(formData: FormData) {
  const seasonId = readFormValue(formData, 'seasonId');
  const playerType = readPlayerType(readFormValue(formData, 'playerType'));
  let gender = readGender(readFormValue(formData, 'gender'));
  const pdgaNumber = readFormValue(formData, 'pdgaNumber');
  const pdgaRatingValue = readFormValue(formData, 'pdgaRating');
  const pdgaRating = pdgaRatingValue ? Number(pdgaRatingValue) : null;

  if (!seasonId || !playerType || !gender) {
    redirect('/account/free-agency?error=Complete all required Free Agency fields.');
  }
  if (pdgaNumber && !/^\d{1,10}$/.test(pdgaNumber)) {
    redirect('/account/free-agency?error=PDGA number must contain digits only.');
  }
  if (pdgaRating !== null && (!Number.isInteger(pdgaRating) || pdgaRating < 1 || pdgaRating > 2000)) {
    redirect('/account/free-agency?error=Enter a valid PDGA rating.');
  }

  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) redirect('/account/free-agency?error=Sign in first.');

  const launchSupabase = supabase as any;
  const {data: profile, error: profileError} = await launchSupabase
    .from('launch_profiles')
    .select('player_id, status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (profileError) redirect(`/account/free-agency?error=${encodeURIComponent(profileError.message)}`);
  if (!profile || profile.status === 'Rejected' || profile.status === 'Suspended') {
    redirect('/account/free-agency?error=This league account cannot enter Free Agency.');
  }

  if (profile.player_id) {
    const [{data: playerRow, error: playerError}, {data: genderLocked, error: genderLockError}] = await Promise.all([
      launchSupabase
        .from('launch_players')
        .select('gender')
        .eq('id', profile.player_id)
        .maybeSingle(),
      launchSupabase.rpc('launch_player_gender_locked', {target_player_id: profile.player_id}),
    ]);
    if (playerError) redirect(`/account/free-agency?error=${encodeURIComponent(playerError.message)}`);
    if (genderLockError) redirect(`/account/free-agency?error=${encodeURIComponent(genderLockError.message)}`);

    if (genderLocked === true) {
      const establishedGender = readGender(playerRow?.gender ?? '');
      if (!establishedGender) {
        redirect('/account/free-agency?error=Your permanent division is missing. Ask the commissioner to review your player record.');
      }
      gender = establishedGender;
    }
  }

  const {error} = await (supabase as unknown as FreeAgencyClient).rpc(
    'submit_launch_free_agent_application',
    {
      target_season_id: seasonId,
      target_player_type: playerType,
      target_gender: gender,
      target_pdga_number: pdgaNumber,
      target_pdga_rating: pdgaRating,
    },
  );
  if (error) redirect(`/account/free-agency?error=${encodeURIComponent(error.message)}`);

  revalidatePath('/account');
  revalidatePath('/account/free-agency');
  revalidatePath('/captain');
  revalidatePath('/captain/free-agents');
  revalidatePath('/office/players');
  redirect('/account/free-agency?notice=Your Free Agent listing has been saved for captains.');
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

function readPlayerType(value: string): 'Adult' | 'Junior' | null {
  return value === 'Adult' || value === 'Junior' ? value : null;
}

function readGender(value: string): 'Male' | 'Female' | null {
  return value === 'Male' || value === 'Female' ? value : null;
}

function isEmailNotConfirmed(error: {message?: string; code?: string}): boolean {
  const message = error.message?.trim().toLocaleLowerCase();
  return error.code === 'email_not_confirmed' || message === 'email not confirmed';
}

function getAuthErrorMessage(error: {message?: string; code?: string}): string {
  const message = error.message?.trim();
  if (isEmailNotConfirmed(error)) return 'Your account exists, but your email has not been confirmed.';
  if (message === 'Invalid login credentials') return 'Email or password is wrong. Use password reset if needed.';
  if (message && message !== '{}') return message;
  return 'The account request could not be completed. Try again.';
}
