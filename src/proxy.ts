import {createServerClient} from '@supabase/ssr';
import {NextResponse, type NextRequest} from 'next/server';
import {getSupabaseConfig, hasSupabaseConfig} from '@/lib/supabase/config';
import type {Database} from '@/lib/supabase/database';
import {resolveMatchPublicReference} from '@/services/matches/MatchPublicIdentity';

type CookieUpdate = {
  name: string;
  value: string;
  options?: Parameters<NextResponse['cookies']['set']>[2];
};

export async function proxy(request: NextRequest) {
  if (!hasSupabaseConfig()) return NextResponse.next({request});

  const {url, publishableKey} = getSupabaseConfig();
  let pendingCookies: CookieUpdate[] = [];
  let pendingHeaders: Record<string, string> = {};

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
          pendingCookies = cookiesToSet;
          pendingHeaders = headers;
        },
      },
    },
  );

  // Session-sensitive routes refresh/verify the token before server code uses
  // it. Public league pages are deliberately excluded from the matcher below;
  // their personalized navigation resolves client-side instead.
  await supabase.auth.getClaims();

  const matchReference = readMatchReference(request.nextUrl.pathname);
  if (matchReference) {
    try {
      const resolved = await resolveMatchPublicReference(supabase as any, matchReference);
      if (resolved) {
        const canonicalSlug = resolved.publicSlug;
        if (canonicalSlug && resolved.matchedBy !== 'slug') {
          const redirectUrl = request.nextUrl.clone();
          redirectUrl.pathname = `/matches/${encodeURIComponent(canonicalSlug)}`;
          return applySupabaseState(NextResponse.redirect(redirectUrl, 308), pendingCookies, pendingHeaders);
        }

        if (resolved.matchedBy === 'slug') {
          const rewriteUrl = request.nextUrl.clone();
          rewriteUrl.pathname = `/matches/${encodeURIComponent(resolved.matchId)}`;
          return applySupabaseState(NextResponse.rewrite(rewriteUrl), pendingCookies, pendingHeaders);
        }
      }
    } catch (error) {
      // Identity resolution must never make Matchday unavailable. If the
      // additive migration is mid-rollout or the lookup is temporarily down,
      // preserve the legacy route and let the page handle the request normally.
      console.error('Match public identity resolution failed.', {matchReference, error});
    }
  }

  return applySupabaseState(NextResponse.next({request}), pendingCookies, pendingHeaders);
}

function readMatchReference(pathname: string): string | undefined {
  const match = pathname.match(/^\/matches\/([^/]+)\/?$/);
  return match?.[1];
}

function applySupabaseState(
  response: NextResponse,
  cookies: CookieUpdate[],
  headers: Record<string, string>,
): NextResponse {
  cookies.forEach(({name, value, options}) => response.cookies.set(name, value, options));
  Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
  return response;
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
