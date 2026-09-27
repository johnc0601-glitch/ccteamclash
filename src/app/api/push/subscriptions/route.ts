import {NextRequest, NextResponse} from 'next/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const account = await requireApprovedProfile();
  if (!account) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const body = await request.json().catch(() => null) as {
    endpoint?: unknown;
    keys?: {p256dh?: unknown; auth?: unknown};
  } | null;

  const endpoint = asString(body?.endpoint, 4096);
  const p256dh = asString(body?.keys?.p256dh, 1024);
  const authSecret = asString(body?.keys?.auth, 1024);
  if (!endpoint || !p256dh || !authSecret || !isPushEndpoint(endpoint)) {
    return NextResponse.json({error: 'Invalid subscription'}, {status: 400});
  }

  const admin = createAdminClient() as any;
  const {data: existing} = await admin
    .from('launch_push_subscriptions')
    .select('profile_id,p256dh,auth_secret')
    .eq('endpoint', endpoint)
    .maybeSingle();

  if (
    existing
    && existing.profile_id !== account.profileId
    && (existing.p256dh !== p256dh || existing.auth_secret !== authSecret)
  ) {
    return NextResponse.json({error: 'Subscription endpoint conflict'}, {status: 409});
  }

  const now = new Date().toISOString();
  const {error} = await admin
    .from('launch_push_subscriptions')
    .upsert({
      profile_id: account.profileId,
      endpoint,
      p256dh,
      auth_secret: authSecret,
      user_agent: request.headers.get('user-agent')?.slice(0, 500) || null,
      enabled: true,
      updated_at: now,
      last_seen_at: now,
    }, {onConflict: 'endpoint'});

  if (error) {
    console.error('Push subscription could not be stored.', {profileId: account.profileId, error: error.message});
    return NextResponse.json({error: 'Subscription could not be stored'}, {status: 500});
  }

  return NextResponse.json({ok: true});
}

export async function DELETE(request: NextRequest) {
  const account = await requireApprovedProfile();
  if (!account) return NextResponse.json({error: 'Unauthorized'}, {status: 401});

  const body = await request.json().catch(() => null) as {endpoint?: unknown} | null;
  const endpoint = asString(body?.endpoint, 4096);
  if (!endpoint) return NextResponse.json({error: 'Invalid subscription'}, {status: 400});

  const admin = createAdminClient() as any;
  const {error} = await admin
    .from('launch_push_subscriptions')
    .delete()
    .eq('profile_id', account.profileId)
    .eq('endpoint', endpoint);

  if (error) {
    console.error('Push subscription could not be removed.', {profileId: account.profileId, error: error.message});
    return NextResponse.json({error: 'Subscription could not be removed'}, {status: 500});
  }

  return NextResponse.json({ok: true});
}

async function requireApprovedProfile() {
  const supabase = await createClient();
  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return null;

  const {data: profile} = await supabase
    .from('launch_profiles')
    .select('id,status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile || profile.status !== 'Approved') return null;
  return {profileId: profile.id};
}

function asString(value: unknown, maxLength: number) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  return trimmed.length <= maxLength ? trimmed : '';
}

function isPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}
