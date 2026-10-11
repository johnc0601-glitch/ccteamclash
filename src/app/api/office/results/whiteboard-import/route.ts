import {processMatchdayImage} from '@/services/media/MediaImageProcessor';
import {StoryAccessError, requireStoryCommissioner} from '@/services/stories/StoryEditorAccess';
import {
  normalizeWhiteboardImport,
  whiteboardImportPrompt,
  type WhiteboardRosterPlayer,
} from '@/services/results/WhiteboardImport';

const MAX_FILES = 4;
const MAX_FILE_BYTES = 15_000_000;
const MAX_TOTAL_BYTES = 35_000_000;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);
const DEFAULT_MODEL = 'gpt-6-sol';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {supabase} = await requireStoryCommissioner();
    const formData = await request.formData();
    const matchId = stringValue(formData.get('matchId'));

    if (!matchId || matchId.length > 200) {
      return Response.json({error: 'Choose a valid Matchday before importing whiteboards.'}, {status: 400});
    }

    const files = formData.getAll('files').filter((value): value is File => value instanceof File);
    if (!files.length) {
      return Response.json({error: 'Take or choose at least one whiteboard photo.'}, {status: 400});
    }
    if (files.length > MAX_FILES) {
      return Response.json({error: `Use no more than ${MAX_FILES} whiteboard photos per import.`}, {status: 400});
    }

    let totalBytes = 0;
    for (const file of files) {
      totalBytes += file.size;
      if (file.size > MAX_FILE_BYTES) {
        return Response.json({error: `${file.name || 'A photo'} is too large. Maximum size is 15 MB per photo.`}, {status: 400});
      }
      if (!isAllowedImage(file)) {
        return Response.json({error: 'Whiteboard photos must be JPG, PNG, WebP, HEIC, or HEIF.'}, {status: 400});
      }
    }
    if (totalBytes > MAX_TOTAL_BYTES) {
      return Response.json({error: 'The selected whiteboard photos are too large together. Use fewer or smaller photos.'}, {status: 400});
    }

    const db = supabase as any;
    const [{data: match, error: matchError}, {data: existingResult, error: resultError}] = await Promise.all([
      db
        .from('launch_schedule_matches')
        .select('id,home_team_id,away_team_id')
        .eq('id', matchId)
        .maybeSingle(),
      db
        .from('launch_match_results')
        .select('status')
        .eq('match_id', matchId)
        .maybeSingle(),
    ]);

    if (matchError) throw matchError;
    if (resultError) throw resultError;
    if (!match?.home_team_id || !match?.away_team_id) {
      return Response.json({error: 'This Matchday does not have both teams assigned.'}, {status: 400});
    }
    if (existingResult?.status === 'Published') {
      return Response.json({error: 'This result is already final. Whiteboard import is only available for draft results.'}, {status: 409});
    }

    const [{data: teams, error: teamError}, {data: rosterRows, error: rosterError}] = await Promise.all([
      db
        .from('launch_teams')
        .select('id,name')
        .in('id', [match.home_team_id, match.away_team_id]),
      db
        .from('launch_match_roster_snapshot_players')
        .select('team_id,player_id,player_name_snapshot')
        .eq('match_id', matchId)
        .in('team_id', [match.home_team_id, match.away_team_id])
        .order('player_name_snapshot'),
    ]);

    if (teamError) throw teamError;
    if (rosterError) throw rosterError;
    if (!rosterRows?.length) {
      return Response.json({
        error: 'The official Matchday roster is not locked yet. Lock the roster before using AI whiteboard import.',
      }, {status: 409});
    }

    const teamNameById = new Map<string, string>((teams ?? []).map((team: {id: string; name: string}) => [team.id, team.name]));
    const homeTeamName = teamNameById.get(match.home_team_id) ?? match.home_team_id;
    const awayTeamName = teamNameById.get(match.away_team_id) ?? match.away_team_id;
    const roster: WhiteboardRosterPlayer[] = rosterRows.map((row: {
      team_id: string;
      player_id: string;
      player_name_snapshot: string;
    }) => ({
      id: row.player_id,
      name: row.player_name_snapshot,
      teamId: row.team_id,
    }));

    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return Response.json({
        error: 'AI whiteboard import is installed but OPENAI_API_KEY is not configured yet.',
        code: 'AI_NOT_CONFIGURED',
      }, {status: 503});
    }

    const model = process.env.WHITEBOARD_AI_MODEL?.trim() || DEFAULT_MODEL;
    const processedImages = await Promise.all(files.map((file) => processMatchdayImage(file)));
    const prompt = whiteboardImportPrompt({
      homeTeamId: match.home_team_id,
      homeTeamName,
      awayTeamId: match.away_team_id,
      awayTeamName,
      roster,
    });

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: [{
          role: 'user',
          content: [
            {type: 'input_text', text: prompt},
            ...processedImages.map((image) => ({
              type: 'input_image',
              image_url: `data:${image.mimeType};base64,${image.image.toString('base64')}`,
              detail: 'high',
            })),
          ],
        }],
        max_output_tokens: 9000,
      }),
      signal: AbortSignal.timeout(50_000),
    });

    const responseBody = await response.json().catch(() => null) as any;
    if (!response.ok) {
      const message = responseBody?.error?.message || 'The AI service could not analyze these photos.';
      console.error('Whiteboard AI import failed.', {
        status: response.status,
        errorType: responseBody?.error?.type ?? null,
      });
      return Response.json({error: safeAiError(message, response.status)}, {status: 502});
    }

    const outputText = responseText(responseBody);
    if (!outputText) {
      return Response.json({error: 'The AI service returned no readable result data. Try clearer photos.'}, {status: 502});
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripJsonFences(outputText));
    } catch {
      console.error('Whiteboard AI import returned invalid JSON.', {
        responseId: responseBody?.id ?? null,
        outputLength: outputText.length,
      });
      return Response.json({
        error: 'The AI read the photos but returned an invalid draft. Try the import again.',
      }, {status: 502});
    }

    const imported = normalizeWhiteboardImport(parsed, {
      matchId,
      homeTeamId: match.home_team_id,
      awayTeamId: match.away_team_id,
      roster,
      model,
    });

    return Response.json({
      ...imported,
      homeTeamName,
      awayTeamName,
      imageCount: processedImages.length,
    });
  } catch (error) {
    if (error instanceof StoryAccessError) {
      return Response.json({error: error.message}, {status: error.status});
    }
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      return Response.json({error: 'AI whiteboard analysis timed out. Try fewer photos or retry.'}, {status: 504});
    }
    const message = error instanceof Error ? error.message : 'Whiteboard import failed.';
    console.error('Whiteboard import route failed.', {
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
    return Response.json({error: message}, {status: 500});
  }
}

function responseText(body: any): string {
  if (typeof body?.output_text === 'string' && body.output_text.trim()) return body.output_text.trim();
  if (!Array.isArray(body?.output)) return '';

  const texts: string[] = [];
  for (const item of body.output) {
    if (!Array.isArray(item?.content)) continue;
    for (const content of item.content) {
      if ((content?.type === 'output_text' || content?.type === 'text') && typeof content?.text === 'string') {
        texts.push(content.text);
      }
    }
  }
  return texts.join('\n').trim();
}

function stripJsonFences(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('```')) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
}

function isAllowedImage(file: File): boolean {
  if (ALLOWED_TYPES.has(file.type.toLowerCase())) return true;
  return /\.(jpe?g|png|webp|heic|heif)$/i.test(file.name);
}

function stringValue(value: FormDataEntryValue | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function safeAiError(message: string, status: number): string {
  if (status === 401 || status === 403) return 'AI whiteboard import is not authorized. Check the OpenAI API key.';
  if (status === 429) return 'AI whiteboard import is temporarily rate-limited. Retry in a moment.';
  if (status >= 500) return 'The AI service is temporarily unavailable. Retry in a moment.';
  return message.slice(0, 300);
}
