import type {Team} from '@/models/Team';
import type {TeamQuery, TeamInput, TeamServiceResult} from '@/types/team';
import {
  archiveStoredTeam,
  createStoredTeam,
  deleteStoredTeam,
  getStoredTeamById,
  getStoredTeams,
  updateStoredTeam,
} from '@/services/teams/TeamStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type TeamActionPayload =
  | {action: 'create'; input: TeamInput}
  | {action: 'update'; id: string; input: TeamInput}
  | {action: 'archive'; id: string}
  | {action: 'delete'; id: string};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (id) {
    return Response.json({team: await getStoredTeamById(id)});
  }

  const query: Partial<TeamQuery> = {
    search: url.searchParams.get('search') ?? '',
    status: (url.searchParams.get('status') as TeamQuery['status'] | null) ?? 'all',
    sort: (url.searchParams.get('sort') as TeamQuery['sort'] | null) ?? 'alphabetical',
  };
  const teams = await getStoredTeams(query);
  return Response.json({teams});
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as Partial<TeamActionPayload>;

    if (payload.action === 'create' && payload.input) {
      return teamResponse(await createStoredTeam(payload.input));
    }
    if (payload.action === 'update' && payload.id && payload.input) {
      return teamResponse(await updateStoredTeam(payload.id, payload.input));
    }
    if (payload.action === 'archive' && payload.id) {
      return teamResponse(await archiveStoredTeam(payload.id));
    }
    if (payload.action === 'delete' && payload.id) {
      return teamResponse(await deleteStoredTeam(payload.id));
    }

    return Response.json({error: 'Unsupported team action.'}, {status: 400});
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Teams could not be saved.';
    return Response.json({error: message}, {status: 400});
  }
}

async function teamResponse(result: TeamServiceResult<Team | string>) {
  if (!result.ok) {
    return Response.json(result, {status: 400});
  }

  const teams = await getStoredTeams();
  return Response.json({...result, teams});
}
