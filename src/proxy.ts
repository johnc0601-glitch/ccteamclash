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

  // Session-sensitive routes refresh/verify the token before server code uses
  // it. Public league pages are deliberately excluded from the matcher below;
  // their personalized navigation resolves client-side instead.
  await supabase.auth.getClaims();

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/account/:path*',
    '/admin/:path*',
    '/captain/:path*',
    '/office/:path*',
    '/matches/:path*',
    '/api/:path*',
    '/auth/:path*',
    '/confirm-signup',
  ],
};
