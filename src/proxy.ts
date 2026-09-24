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

  // Session-sensitive routes refresh/verify the token before server code uses it.
  // Public league pages keep personalized access state client-side. A rotated or
  // revoked refresh token is a normal signed-out state, not a request failure.
  try {
    const {error} = await supabase.auth.getClaims();
    if (error) {
      if (!isRefreshTokenNotFound(error)) throw error;
      pendingCookies = clearStaleSupabaseAuthCookies(request, url, pendingCookies);
    }
  } catch (error) {
    if (!isRefreshTokenNotFound(error)) throw error;
    pendingCookies = clearStaleSupabaseAuthCookies(request, url, pendingCookies);
  }

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

function isRefreshTokenNotFound(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as {code?: unknown}).code === 'refresh_token_not_found';
}

function clearStaleSupabaseAuthCookies(
  request: NextRequest,
  supabaseUrl: string,
  cookies: CookieUpdate[],
): CookieUpdate[] {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const authCookiePrefix = `sb-${projectRef}-auth-token`;
  const staleCookieNames = request.cookies.getAll()
    .map(({name}) => name)
    .filter((name) => name.startsWith(authCookiePrefix));
  if (!staleCookieNames.length) return cookies;

  const staleCookieSet = new Set(staleCookieNames);
  staleCookieNames.forEach((name) => request.cookies.delete(name));
  return [
    ...cookies.filter(({name}) => !staleCookieSet.has(name)),
    ...staleCookieNames.map((name) => ({
      name,
      value: '',
      options: {path: '/', maxAge: 0},
    })),
  ];
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
