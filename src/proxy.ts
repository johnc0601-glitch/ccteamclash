import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';
import {getSupabaseConfig, hasSupabaseConfig} from '@/lib/supabase/config';
import type {Database} from '@/lib/supabase/database';

export async function proxy(request: NextRequest) {
  if (!hasSupabaseConfig()) return NextResponse.next({request});

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

  // Supabase recommends getClaims() for SSR token refresh/verification. With
  // asymmetric signing keys this verifies locally against the cached JWKS
  // instead of making an Auth-server request on every page navigation.
  await supabase.auth.getClaims();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
