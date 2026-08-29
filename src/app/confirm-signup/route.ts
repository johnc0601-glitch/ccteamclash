import {NextResponse} from 'next/server';

const SUPABASE_HOST = 'iwyssbrekhwkjnlagxzc.supabase.co';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const confirmationUrl = requestUrl.searchParams.get('confirmation_url');
  const target = getValidConfirmationUrl(confirmationUrl);

  if (!target) {
    return redirectWithError(requestUrl, confirmationUrl ? 'Confirmation link is invalid.' : 'Confirmation link is missing.');
  }

  return new NextResponse(renderConfirmationPage(target.toString()), {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'Content-Type': 'text/html; charset=utf-8',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const confirmationUrl = formData.get('confirmation_url');
  const target = getValidConfirmationUrl(typeof confirmationUrl === 'string' ? confirmationUrl : null);

  if (!target) {
    return redirectWithError(requestUrl, 'Confirmation link is invalid.');
  }

  return NextResponse.redirect(target, 303);
}

function getValidConfirmationUrl(value: string | null): URL | null {
  if (!value) return null;

  let target: URL;
  try {
    target = new URL(value);
  } catch {
    return null;
  }

  const validSupabaseConfirmation =
    target.protocol === 'https:' &&
    target.hostname === SUPABASE_HOST &&
    target.pathname === '/auth/v1/verify';

  return validSupabaseConfirmation ? target : null;
}

function redirectWithError(requestUrl: URL, message: string) {
  return NextResponse.redirect(
    new URL(`/account?error=${encodeURIComponent(message)}`, requestUrl.origin),
  );
}

function renderConfirmationPage(confirmationUrl: string): string {
  const safeUrl = escapeHtml(confirmationUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="robots" content="noindex,nofollow" />
    <title>Confirm your Coastal Clash account</title>
    <style>
      :root { color-scheme: light; font-family: Arial, Helvetica, sans-serif; }
      body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f3f1e9; color: #121814; }
      main { width: min(92vw, 560px); box-sizing: border-box; padding: 32px; border: 1px solid #d8d5ca; border-radius: 14px; background: #fff; box-shadow: 0 18px 50px rgba(18,24,20,.10); }
      .eyebrow { margin: 0 0 10px; color: #7b5a00; font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
      h1 { margin: 0 0 14px; font-size: 32px; line-height: 1.05; text-transform: uppercase; }
      p { margin: 0 0 22px; color: #5d655f; line-height: 1.55; }
      form { margin: 0; }
      button { width: 100%; min-height: 48px; border: 1px solid #ffc400; border-radius: 8px; background: #ffc400; color: #111; cursor: pointer; font: inherit; font-size: 13px; font-weight: 900; letter-spacing: .05em; text-transform: uppercase; }
      button:hover { filter: brightness(.96); }
      .note { margin: 16px 0 0; font-size: 12px; }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Coastal Clash</p>
      <h1>Confirm your email</h1>
      <p>Click the button below to confirm your email address and finish creating your account.</p>
      <form method="post" action="/confirm-signup">
        <input type="hidden" name="confirmation_url" value="${safeUrl}" />
        <button type="submit">Confirm email address</button>
      </form>
      <p class="note">This extra click prevents email security scanners from using your one-time confirmation link before you do.</p>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}
