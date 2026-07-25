import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') ?? '/account';

  if (code) {
    const supabase = await createClient();
    const {error} = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const message = encodeURIComponent('That sign-in link is expired or invalid. Request a new email link.');
      return NextResponse.redirect(new URL(`/account?error=${message}`, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
