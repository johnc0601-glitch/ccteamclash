import {NextResponse} from 'next/server';
import {ensureLaunchSignupProfile} from '@/domain/launch/LaunchAccountSetup';
import {createClient} from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/account';

  if (code) {
    const supabase = await createClient();
    const {error} = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const resetFlow = next === '/account/reset-password';
      const message = encodeURIComponent(resetFlow
        ? 'That reset link is expired or invalid. Request a new one.'
        : 'That confirmation link is expired or invalid. Sign in or create a new account.');
      const destination = resetFlow ? '/account/forgot-password' : '/account';
      return NextResponse.redirect(new URL(`${destination}?error=${message}`, requestUrl.origin));
    }
    const {data} = await supabase.auth.getUser();
    if (data.user) {
      const setupError = await ensureLaunchSignupProfile(supabase, data.user);
      if (setupError) {
        return NextResponse.redirect(new URL(`/account?error=${encodeURIComponent(setupError)}`, requestUrl.origin));
      }
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
