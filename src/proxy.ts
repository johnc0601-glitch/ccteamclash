import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';
import {getSupabaseConfig, hasSupabaseConfig} from '@/lib/supabase/config';
import type {Database} from '@/lib/supabase/database';

export async function proxy(request: NextRequest) {
  if (!hasSupabaseConfig()) return NextResponse.next({request});

  const hasSupabaseSession = request.cookies
    .getAll()
    .some(({name}) => name.startsWith('sb-') && name.includes('-auth-token'));

  // Public anonymous traffic does not need to wait on Supabase Auth. Protected
  // routes still verify access in their server-side authorization code, while
  // signed-in requests continue through the session refresh path below.
  if (!hasSupabaseSession) return NextResponse.next({request});

  let supabaseResponse = NextResponse.next({request});
  const {url, publishableKey} = getSupabaseConfig();

  const supabase = createServerClient<Database>(
    url,
    publishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({name, value}) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({request});
          cookiesToSet.forEach(({name, value, options}) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          Object.entries(headers).forEach(([key, value]) => {
            supabaseResponse.headers.set(key, value);
          });
        },
      },
    },
  );

  // getClaims verifies the access token without forcing the Auth-server round
  // trip that getUser performs on every request. The SSR client can still use
  // setAll above when session cookies need to be refreshed.
  await supabase.auth.getClaims();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
