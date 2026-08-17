import {NextResponse} from 'next/server';
import {INTRO_COOKIE_NAME} from '@/components/intro/intro.config';
import {createClient} from '@/lib/supabase/server';
import {completeAuthCallback} from './completeAuthCallback';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const flow = requestUrl.searchParams.get('flow');
  const next = getSafeDestination(requestUrl.searchParams.get('next'));
  let magicLinkAuthenticated = false;

  if (code) {
    const supabase = await createClient();
    const completion = await completeAuthCallback(supabase, code);
    if (!completion.ok) {
      if (completion.stage === 'profile') {
        return NextResponse.redirect(new URL(`/account?error=${encodeURIComponent(completion.message)}`, requestUrl.origin));
      }
      const resetFlow = next === '/account/reset-password';
      const message = encodeURIComponent(resetFlow
        ? 'That reset link is expired or invalid. Request a new one.'
        : 'That confirmation link is expired or invalid. Sign in or create a new account.');
      const destination = resetFlow ? '/account/forgot-password' : '/account';
      return NextResponse.redirect(new URL(`${destination}?error=${message}`, requestUrl.origin));
    }
    if (completion.user) {
      magicLinkAuthenticated = flow === 'magic-link';
    }
  }

  const response = NextResponse.redirect(new URL(next, requestUrl.origin));

  if (magicLinkAuthenticated) {
    response.cookies.set(INTRO_COOKIE_NAME, '1', {
      httpOnly: false,
      maxAge: 120,
      path: '/',
      sameSite: 'lax',
      secure: requestUrl.protocol === 'https:',
    });
  }

  return response;
}

function getSafeDestination(next: string | null): string {
  if (!next?.startsWith('/') || next.startsWith('//')) return '/account';
  return next;
}
