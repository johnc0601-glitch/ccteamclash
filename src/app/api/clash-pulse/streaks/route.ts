// Streaks and broken streaks are withdrawn until the data and calculations
// have been reviewed. The implementation remains preserved in Git history.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({error: 'Streak research is temporarily unavailable.'}, {status: 404});
}
