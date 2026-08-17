'use server';

import {redirect} from 'next/navigation';
import {requiredConfirmationProjectRef, validateSignupConfirmationUrl} from './confirmationUrl';

export async function confirmSignupEmail(formData: FormData): Promise<never> {
  const confirmationUrl = formData.get('confirmationUrl');
  const validation = validateSignupConfirmationUrl({
    confirmationUrl: typeof confirmationUrl === 'string' ? confirmationUrl : '',
    requiredProjectRef: requiredConfirmationProjectRef(),
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  });

  if (!validation.ok) {
    redirect(`/confirm-signup?error=${encodeURIComponent(validation.message)}`);
  }

  redirect(validation.url);
}
