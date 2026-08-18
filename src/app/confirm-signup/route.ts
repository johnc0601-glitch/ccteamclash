import {NextResponse} from 'next/server';

const SUPABASE_HOST = 'iwyssbrekhwkjnlagxzc.supabase.co';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const confirmationUrl = requestUrl.searchParams.get('confirmation_url');

  if (!confirmationUrl) {
    return NextResponse.redirect(
      new URL('/account?error=Confirmation%20link%20is%20missing.', requestUrl.origin),
    );
  }

  let target: URL;
  try {
    target = new URL(confirmationUrl);
  } catch {
    return NextResponse.redirect(
      new URL('/account?error=Confirmation%20link%20is%20invalid.', requestUrl.origin),
    );
  }

  const validSupabaseConfirmation =
    target.protocol === 'https:' &&
    target.hostname === SUPABASE_HOST &&
    target.pathname === '/auth/v1/verify';

  if (!validSupabaseConfirmation) {
    return NextResponse.redirect(
      new URL('/account?error=Confirmation%20link%20is%20invalid.', requestUrl.origin),
    );
  }

  return NextResponse.redirect(target);
}
