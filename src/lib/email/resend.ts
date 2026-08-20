import 'server-only';

export type ReminderEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  tags?: Array<{name: string; value: string}>;
};

const RESEND_BATCH_URL = 'https://api.resend.com/emails/batch';
const DEFAULT_FROM = 'Coastal Carolina Team Clash <commish@ccteamclash.com>';

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendReminderBatch(emails: ReminderEmail[]): Promise<void> {
  if (!emails.length) return;
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error('Missing RESEND_API_KEY.');

  const response = await fetch(RESEND_BATCH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emails.map((email) => ({
      from: DEFAULT_FROM,
      to: [email.to],
      subject: email.subject,
      text: email.text,
      html: email.html,
      tags: email.tags,
    }))),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend batch failed (${response.status})${detail ? `: ${detail.slice(0, 300)}` : ''}`);
  }
}
