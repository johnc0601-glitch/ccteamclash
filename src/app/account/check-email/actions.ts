'use server';

import {headers} from 'next/headers';
import {redirect} from 'next/navigation';
import {createClient} from '@/lib/supabase/server';

export async function resendSignupConfirmation(formData: FormData) {
  const email = readFormValue(formData, 'email');
  if (!email) {
    redirect('/account/check-email?error=Enter your email address to resend the confirmation email.');
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const {error} = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?flow=signup-confirm&next=/account`,
    },
  });

  if (error) {
    const message = error.code === 'over_email_send_rate_limit'
      ? 'Please wait a few minutes before requesting another confirmation email.'
      : (error.message?.trim() || 'The confirmation email could not be sent.');
    redirect(`/account/check-email?email=${encodeURIComponent(email)}&error=${encodeURIComponent(message)}`);
  }

  redirect(`/account/check-email?email=${encodeURIComponent(email)}&notice=${encodeURIComponent('A new confirmation email was sent. Use the newest email and click Confirm email address.')}`);
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
