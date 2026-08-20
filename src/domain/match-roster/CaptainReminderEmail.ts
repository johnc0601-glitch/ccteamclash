import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';

export type CaptainReminderRecipient = {
  playerId: string;
  playerName: string;
  email: string;
};

export function buildCaptainReminderRecipients(
  players: TeamAttendanceMember[],
  emailByPlayerId: Map<string, string>,
): CaptainReminderRecipient[] {
  return players
    .filter((player) => player.status === 'Unconfirmed')
    .map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      email: emailByPlayerId.get(player.playerId)?.trim() ?? '',
    }))
    .filter((recipient) => Boolean(recipient.email));
}

export function buildCaptainReminderMessage(input: {
  awayTeamName: string;
  homeTeamName: string;
  matchDateLabel: string;
  matchUrl: string;
}) {
  const matchup = `${input.awayTeamName} at ${input.homeTeamName}`;
  const subject = `${matchup} — Can you play?`;
  const text = [
    `We still need your availability for ${matchup} on ${input.matchDateLabel}.`,
    '',
    'Open Matchday and choose Yes or No before Friday at 12:00 PM Eastern.',
    '',
    input.matchUrl,
  ].join('\n');
  const safeMatchup = escapeHtml(matchup);
  const safeDate = escapeHtml(input.matchDateLabel);
  const safeUrl = escapeHtml(input.matchUrl);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>${safeMatchup}</title>
</head>
<body style="margin:0; background-color:#f4f4f1;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%; background-color:#f4f4f1;">
<tr><td align="center" style="padding-top:32px; padding-right:16px; padding-bottom:32px; padding-left:16px; background-color:#f4f4f1;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:8px;">
<tr><td bgcolor="#ffffff" style="padding-top:32px; padding-right:32px; padding-bottom:12px; padding-left:32px; background-color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:20px; color:#555555;">COASTAL CAROLINA TEAM CLASH</td></tr>
<tr><td bgcolor="#ffffff" style="padding-top:0; padding-right:32px; padding-bottom:12px; padding-left:32px; background-color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:28px; line-height:34px; font-weight:700; color:#101820;">Can you play?</td></tr>
<tr><td bgcolor="#ffffff" style="padding-top:0; padding-right:32px; padding-bottom:22px; padding-left:32px; background-color:#ffffff; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:24px; color:#333333;">We still need your availability for <strong>${safeMatchup}</strong> on ${safeDate}. Choose Yes or No before Friday at 12:00 PM Eastern.</td></tr>
<tr><td bgcolor="#ffffff" align="left" style="padding-top:0; padding-right:32px; padding-bottom:32px; padding-left:32px; background-color:#ffffff;">
<table cellpadding="0" cellspacing="0" border="0" role="presentation"><tr><td bgcolor="#007680" style="background-color:#007680; border-radius:6px;"><a href="${safeUrl}" style="display:inline-block; padding-top:13px; padding-right:22px; padding-bottom:13px; padding-left:22px; font-family:Arial, Helvetica, sans-serif; font-size:16px; line-height:20px; font-weight:700; color:#ffffff; text-decoration:none;">View Matchday</a></td></tr></table>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return {subject, text, html};
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
