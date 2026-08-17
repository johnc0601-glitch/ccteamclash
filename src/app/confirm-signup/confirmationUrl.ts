const VERIFY_PATH = '/auth/v1/verify';
const CALLBACK_PATH = '/auth/callback';
export const PRODUCTION_SUPABASE_PROJECT_REF = 'iwyssbrekhwkjnlagxzc';

export type ConfirmationUrlValidation =
  | {ok: true; url: string}
  | {ok: false; message: string};

export function validateSignupConfirmationUrl(input: {
  confirmationUrl: string;
  siteUrl: string | undefined;
  supabaseUrl: string | undefined;
  requiredProjectRef?: string;
}): ConfirmationUrlValidation {
  const {confirmationUrl, requiredProjectRef, siteUrl, supabaseUrl} = input;
  if (!confirmationUrl || !siteUrl || !supabaseUrl) return invalidConfirmationUrl();

  let candidate: URL;
  let expectedSite: URL;
  let expectedSupabase: URL;
  try {
    candidate = new URL(confirmationUrl);
    expectedSite = new URL(siteUrl);
    expectedSupabase = new URL(supabaseUrl);
  } catch {
    return invalidConfirmationUrl();
  }

  const sameSupabaseOrigin = candidate.origin === expectedSupabase.origin;
  const expectedProjectHost = requiredProjectRef ? `${requiredProjectRef}.supabase.co` : undefined;
  const safeSupabaseEndpoint = (
    candidate.protocol === 'https:'
    && !candidate.username
    && !candidate.password
    && sameSupabaseOrigin
    && (!expectedProjectHost || candidate.hostname === expectedProjectHost)
    && candidate.pathname === VERIFY_PATH
  );
  if (!safeSupabaseEndpoint) return invalidConfirmationUrl();

  const token = candidate.searchParams.get('token') ?? candidate.searchParams.get('token_hash');
  const type = candidate.searchParams.get('type');
  if (!token || !['signup', 'email'].includes(type ?? '')) return invalidConfirmationUrl();

  const redirectTo = candidate.searchParams.get('redirect_to');
  if (!redirectTo) return invalidConfirmationUrl();

  let callback: URL;
  try {
    callback = new URL(redirectTo);
  } catch {
    return invalidConfirmationUrl();
  }

  const safeCallback = (
    callback.origin === expectedSite.origin
    && callback.pathname === CALLBACK_PATH
    && callback.searchParams.get('next') === '/account'
    && [...callback.searchParams.keys()].every((key) => key === 'next')
  );
  if (!safeCallback) return invalidConfirmationUrl();

  return {ok: true, url: candidate.href};
}

export function requiredConfirmationProjectRef(): string | undefined {
  return process.env.VERCEL_ENV === 'production' ? PRODUCTION_SUPABASE_PROJECT_REF : undefined;
}

function invalidConfirmationUrl(): ConfirmationUrlValidation {
  return {
    ok: false,
    message: 'This confirmation link is invalid or is not intended for this Team Clash site.',
  };
}
