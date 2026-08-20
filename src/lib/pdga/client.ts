import 'server-only';

const PDGA_BASE_URL = 'https://api.pdga.com';

type PdgaSession = {
  sessid: string;
  session_name: string;
  token: string;
};

export type PdgaPlayer = {
  first_name: string;
  last_name: string;
  pdga_number: string;
  membership_status?: string;
  classification?: string;
  rating?: string;
  rating_effective_date?: string;
};

export type PdgaClient = {
  getPlayer(pdgaNumber: string): Promise<PdgaPlayer | null>;
  close(): Promise<void>;
};

export async function createPdgaClient(): Promise<PdgaClient> {
  const username = process.env.PDGA_USERNAME;
  const password = process.env.PDGA_PASSWORD;

  if (!username || !password) {
    throw new Error('PDGA_USERNAME and PDGA_PASSWORD must be configured on the server.');
  }

  const session = await login(username, password);

  return {
    async getPlayer(pdgaNumber: string) {
      const normalized = pdgaNumber.trim();
      if (!/^\d+$/.test(normalized)) {
        throw new Error(`Invalid PDGA number: ${pdgaNumber}`);
      }

      const url = new URL('/services/json/players', PDGA_BASE_URL);
      url.searchParams.set('pdga_number', normalized);
      url.searchParams.set('limit', '1');

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Cookie: `${session.session_name}=${session.sessid}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`PDGA player lookup failed with status ${response.status}.`);
      }

      const payload = await response.json() as {players?: PdgaPlayer[]};
      return payload.players?.[0] ?? null;
    },

    async close() {
      try {
        await fetch(new URL('/services/json/user/logout', PDGA_BASE_URL), {
          method: 'POST',
          headers: {
            'X-CSRF-Token': session.token,
            Cookie: `${session.session_name}=${session.sessid}`,
          },
          cache: 'no-store',
        });
      } catch {
        // Session cleanup should never make a completed rating sync fail.
      }
    },
  };
}

async function login(username: string, password: string): Promise<PdgaSession> {
  const response = await fetch(new URL('/services/json/user/login', PDGA_BASE_URL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({username, password}),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`PDGA login failed with status ${response.status}.`);
  }

  const payload = await response.json() as Partial<PdgaSession>;
  if (!payload.sessid || !payload.session_name || !payload.token) {
    throw new Error('PDGA login response did not contain a valid session.');
  }

  return {
    sessid: payload.sessid,
    session_name: payload.session_name,
    token: payload.token,
  };
}
