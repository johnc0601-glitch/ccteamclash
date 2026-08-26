'use server';

import {revalidatePath} from 'next/cache';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

const MAX_LOGO_SIZE_BYTES = 5_000_000;
const ALLOWED_LOGO_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg', 'image/svg+xml']);

type CaptainReviewClient = {
  rpc: (
    fn: 'captain_review_launch_player_application',
    args: {
      target_application_id: string;
      target_status: 'Approved' | 'Rejected';
      target_gender: string | null;
      target_player_type: string | null;
    },
  ) => Promise<{error: {message: string} | null}>;
};

type CaptainReturnClient = {
  rpc: (
    fn: 'captain_return_rostered_player_to_commissioner',
    args: {target_player_id: string},
  ) => Promise<{error: {message: string} | null}>;
};

type CaptainRegistrationEditClient = {
  rpc: (
    fn: 'captain_update_rostered_player_registration',
    args: {
      target_player_id: string;
      target_name: string;
      target_pdga_number: string;
      target_gender: 'Male' | 'Female';
      target_is_junior: boolean;
    },
  ) => Promise<{error: {message: string} | null}>;
};

export async function confirmTeamApplication(formData: FormData) {
  await reviewTeamApplication(formData, 'Approved');
}

export async function rejectTeamApplication(formData: FormData) {
  await reviewTeamApplication(formData, 'Rejected');
}

export async function saveRosterPlayerRegistration(formData: FormData) {
  const playerId = readFormValue(formData, 'playerId');
  const name = readFormValue(formData, 'name');
  const pdgaNumber = readFormValue(formData, 'pdgaNumber');
  const gender = readFormValue(formData, 'gender');
  const isJunior = readFormValue(formData, 'isJunior') === 'true';

  if (!playerId) redirect('/captain?error=Player is required.');
  if (!name) redirect('/captain?error=Player name is required.');
  if (gender !== 'Male' && gender !== 'Female') {
    redirect('/captain?error=Choose Male or Female.');
  }
  if (pdgaNumber && !/^\d+$/.test(pdgaNumber)) {
    redirect('/captain?error=PDGA number must contain digits only.');
  }

  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/account?error=Sign in first.');

  const {error: updateError} = await (supabase as unknown as CaptainRegistrationEditClient).rpc(
    'captain_update_rostered_player_registration',
    {
      target_player_id: playerId,
      target_name: name,
      target_pdga_number: pdgaNumber,
      target_gender: gender,
      target_is_junior: isJunior,
    },
  );
  if (updateError) redirect(`/captain?error=${encodeURIComponent(updateError.message)}`);

  revalidatePath('/captain');
  revalidatePath('/office/players');
  revalidatePath('/players');
  revalidatePath('/account');
  revalidatePath('/teams');
  revalidatePath('/rankings');
  redirect(`/captain?notice=${encodeURIComponent('Player registration updated.')}`);
}

export async function returnRosteredPlayerToCommissioner(formData: FormData) {
  const playerId = readFormValue(formData, 'playerId');
  if (!playerId) redirect('/captain?error=Player is required.');

  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/account?error=Sign in first.');

  const {error: returnError} = await (supabase as unknown as CaptainReturnClient).rpc(
    'captain_return_rostered_player_to_commissioner',
    {target_player_id: playerId},
  );
  if (returnError) redirect(`/captain?error=${encodeURIComponent(returnError.message)}`);

  revalidatePath('/captain');
  revalidatePath('/office/players');
  revalidatePath('/players');
  revalidatePath('/account');
  revalidatePath('/teams');
  redirect(`/captain?notice=${encodeURIComponent('Player removed from your roster and sent to the commissioner for review.')}`);
}

export async function saveTeamAppearance(formData: FormData) {
  const primaryColor = normalizeHexColor(readFormValue(formData, 'primaryColor'));
  const secondaryColor = normalizeHexColor(readFormValue(formData, 'secondaryColor'));
  if (!primaryColor || !secondaryColor) {
    redirect('/captain?error=Choose valid primary and secondary colors.');
  }

  const supabase = await createClient();
  const {data: authData, error: authError} = await supabase.auth.getUser();
  if (authError || !authData.user) redirect('/account?error=Sign in first.');

  const {data: profile, error: profileError} = await (supabase as any)
    .from('launch_profiles')
    .select('role, status, captain_team_id')
    .eq('user_id', authData.user.id)
    .maybeSingle();
  if (profileError || !profile || profile.status !== 'Approved') {
    redirect('/captain?error=Captain access is required.');
  }
  if ((profile.role !== 'Captain' && profile.role !== 'Commissioner') || !profile.captain_team_id) {
    redirect('/captain?error=No captain team is assigned to this account.');
  }

  const teamId = profile.captain_team_id as string;
  const {data: currentTeam, error: teamError} = await (supabase as any)
    .from('launch_teams')
    .select('id, logo')
    .eq('id', teamId)
    .maybeSingle();
  if (teamError || !currentTeam) redirect('/captain?error=Team could not be found.');

  let logo = typeof currentTeam.logo === 'string' ? currentTeam.logo : '';
  const file = formData.get('logoFile');
  if (file instanceof File && file.size > 0) {
    if (!ALLOWED_LOGO_TYPES.has(file.type)) {
      redirect('/captain?error=Logo must be PNG, JPG, SVG, or WebP.');
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      redirect('/captain?error=Logo file is too large.');
    }

    const extension = file.type === 'image/png'
      ? 'png'
      : file.type === 'image/jpeg'
        ? 'jpg'
        : file.type === 'image/svg+xml'
          ? 'svg'
          : 'webp';
    const path = `teams/${teamId}/logo.${extension}`;
    const {error: uploadError} = await supabase.storage
      .from('team-logos')
      .upload(path, file, {upsert: true, contentType: file.type, cacheControl: '3600'});
    if (uploadError) redirect(`/captain?error=${encodeURIComponent(uploadError.message)}`);
    logo = supabase.storage.from('team-logos').getPublicUrl(path).data.publicUrl;
  }

  const {error: updateError} = await (supabase as any)
    .from('launch_teams')
    .update({
      primary_color: primaryColor,
      secondary_color: secondaryColor,
      logo,
    })
    .eq('id', teamId);
  if (updateError) redirect(`/captain?error=${encodeURIComponent(updateError.message)}`);

  revalidatePath('/captain');
  revalidatePath('/teams');
  revalidatePath(`/teams/${teamId}`);
  revalidatePath('/rankings');
  revalidatePath('/office/teams');
  redirect('/captain?notice=Team appearance updated.');
}

async function reviewTeamApplication(formData: FormData, status: 'Approved' | 'Rejected') {
  const applicationId = readFormValue(formData, 'applicationId');
  if (!applicationId) redirect('/captain?error=Registration is required.');

  const gender = status === 'Approved' ? readFormValue(formData, 'gender') : '';
  const playerType = status === 'Approved' ? readFormValue(formData, 'playerType') : '';
  if (status === 'Approved' && gender !== 'Male' && gender !== 'Female') {
    redirect('/captain?error=Choose Male or Female before approving.');
  }
  if (status === 'Approved' && playerType !== 'Adult' && playerType !== 'Junior') {
    redirect('/captain?error=Player type must be Adult or Junior.');
  }

  const supabase = await createClient();
  const {data, error} = await supabase.auth.getUser();
  if (error || !data.user) redirect('/account?error=Sign in first.');

  const {error: reviewError} = await (supabase as unknown as CaptainReviewClient).rpc(
    'captain_review_launch_player_application',
    {
      target_application_id: applicationId,
      target_status: status,
      target_gender: status === 'Approved' ? gender : null,
      target_player_type: status === 'Approved' ? playerType : null,
    },
  );
  if (reviewError) redirect(`/captain?error=${encodeURIComponent(reviewError.message)}`);

  revalidatePath('/captain');
  revalidatePath('/office/players');
  revalidatePath('/players');
  revalidatePath('/account');
  redirect(`/captain?notice=${encodeURIComponent(
    status === 'Approved' ? 'Player approved and added to your roster.' : 'Season registration rejected.',
  )}`);
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeHexColor(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : null;
}
