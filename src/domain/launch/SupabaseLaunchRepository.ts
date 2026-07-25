import type {SupabaseClient} from '@supabase/supabase-js';
import type {
  EventPost,
  EventRoster,
  EventRosterPlayer,
  LaunchEvent,
  LaunchPlayer,
  LaunchProfile,
  LaunchTeam,
  PlayerClaim,
} from '@/domain/launch/LaunchData';
import type {LaunchRepository} from '@/domain/launch/LaunchRepository';
import type {Database} from '@/lib/supabase/database';

type LaunchSupabaseClient = SupabaseClient<Database>;
type Tables = Database['public']['Tables'];
type ProfileRow = Tables['profiles']['Row'];
type PlayerClaimRow = Tables['player_claims']['Row'];
type PlayerRow = Tables['players']['Row'];
type TeamRow = Tables['teams']['Row'];
type EventRow = Tables['events']['Row'];
type EventRosterRow = Tables['event_rosters']['Row'];
type EventRosterPlayerRow = Tables['event_roster_players']['Row'];
type EventPostRow = Tables['event_posts']['Row'];

export class SupabaseLaunchRepository implements LaunchRepository {
  private readonly supabase: LaunchSupabaseClient;

  constructor(supabase: LaunchSupabaseClient) {
    this.supabase = supabase;
  }

  async getProfiles(): Promise<LaunchProfile[]> {
    const {data, error} = await this.supabase.from('profiles').select('*').order('display_name');
    if (error) throw error;
    return data.map(toProfile);
  }

  async getProfile(id: string): Promise<LaunchProfile | undefined> {
    const {data, error} = await this.supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toProfile(data) : undefined;
  }

  async getProfileByUserId(userId: string): Promise<LaunchProfile | undefined> {
    const {data, error} = await this.supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data ? toProfile(data) : undefined;
  }

  async saveProfile(profile: LaunchProfile): Promise<LaunchProfile> {
    const {data, error} = await this.supabase.from('profiles').upsert(fromProfile(profile)).select().single();
    if (error) throw error;
    return toProfile(data);
  }

  async getPlayerClaims(): Promise<PlayerClaim[]> {
    const {data, error} = await this.supabase.from('player_claims').select('*').order('created_at');
    if (error) throw error;
    return data.map(toPlayerClaim);
  }

  async getPlayerClaim(id: string): Promise<PlayerClaim | undefined> {
    const {data, error} = await this.supabase.from('player_claims').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toPlayerClaim(data) : undefined;
  }

  async savePlayerClaim(claim: PlayerClaim): Promise<PlayerClaim> {
    const {data, error} = await this.supabase.from('player_claims').upsert(fromPlayerClaim(claim)).select().single();
    if (error) throw error;
    return toPlayerClaim(data);
  }

  async getPlayers(): Promise<LaunchPlayer[]> {
    const {data, error} = await this.supabase.from('players').select('*').order('name');
    if (error) throw error;
    return data.map(toPlayer);
  }

  async getPlayer(id: string): Promise<LaunchPlayer | undefined> {
    const {data, error} = await this.supabase.from('players').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toPlayer(data) : undefined;
  }

  async getTeams(): Promise<LaunchTeam[]> {
    const {data, error} = await this.supabase.from('teams').select('*').order('name');
    if (error) throw error;
    return data.map(toTeam);
  }

  async getTeam(id: string): Promise<LaunchTeam | undefined> {
    const {data, error} = await this.supabase.from('teams').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toTeam(data) : undefined;
  }

  async getEvents(): Promise<LaunchEvent[]> {
    const {data, error} = await this.supabase.from('events').select('*').order('date');
    if (error) throw error;
    return data.map(toEvent);
  }

  async getEvent(id: string): Promise<LaunchEvent | undefined> {
    const {data, error} = await this.supabase.from('events').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toEvent(data) : undefined;
  }

  async getEventRosters(eventId?: string): Promise<EventRoster[]> {
    let query = this.supabase.from('event_rosters').select('*');
    if (eventId) query = query.eq('event_id', eventId);

    const {data, error} = await query.order('created_at');
    if (error) throw error;
    return data.map(toEventRoster);
  }

  async getEventRoster(id: string): Promise<EventRoster | undefined> {
    const {data, error} = await this.supabase.from('event_rosters').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toEventRoster(data) : undefined;
  }

  async getEventRosterByEventAndTeam(eventId: string, teamId: string): Promise<EventRoster | undefined> {
    const {data, error} = await this.supabase
      .from('event_rosters')
      .select('*')
      .eq('event_id', eventId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (error) throw error;
    return data ? toEventRoster(data) : undefined;
  }

  async saveEventRoster(roster: EventRoster): Promise<EventRoster> {
    const {data, error} = await this.supabase.from('event_rosters').upsert(fromEventRoster(roster)).select().single();
    if (error) throw error;
    return toEventRoster(data);
  }

  async getEventRosterPlayers(eventRosterId: string): Promise<EventRosterPlayer[]> {
    const {data, error} = await this.supabase
      .from('event_roster_players')
      .select('*')
      .eq('event_roster_id', eventRosterId)
      .order('created_at');
    if (error) throw error;
    return data.map(toEventRosterPlayer);
  }

  async replaceEventRosterPlayers(
    eventRosterId: string,
    players: EventRosterPlayer[],
  ): Promise<EventRosterPlayer[]> {
    const deleteResult = await this.supabase
      .from('event_roster_players')
      .delete()
      .eq('event_roster_id', eventRosterId);
    if (deleteResult.error) throw deleteResult.error;
    if (!players.length) return [];

    const {data, error} = await this.supabase
      .from('event_roster_players')
      .insert(players.map(fromEventRosterPlayer))
      .select();
    if (error) throw error;
    return data.map(toEventRosterPlayer);
  }

  async getEventPosts(eventId: string): Promise<EventPost[]> {
    const {data, error} = await this.supabase
      .from('event_posts')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at');
    if (error) throw error;
    return data.map(toEventPost);
  }

  async getEventPost(id: string): Promise<EventPost | undefined> {
    const {data, error} = await this.supabase.from('event_posts').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toEventPost(data) : undefined;
  }

  async saveEventPost(post: EventPost): Promise<EventPost> {
    const {data, error} = await this.supabase.from('event_posts').upsert(fromEventPost(post)).select().single();
    if (error) throw error;
    return toEventPost(data);
  }
}

function toProfile(row: ProfileRow): LaunchProfile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    playerId: row.player_id,
    captainTeamId: row.captain_team_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromProfile(profile: LaunchProfile): ProfileRow {
  return {
    id: profile.id,
    user_id: profile.userId,
    display_name: profile.displayName,
    role: profile.role,
    status: profile.status,
    player_id: profile.playerId,
    captain_team_id: profile.captainTeamId,
    created_at: profile.createdAt,
    updated_at: profile.updatedAt,
  };
}

function toPlayerClaim(row: PlayerClaimRow): PlayerClaim {
  return {
    id: row.id,
    profileId: row.profile_id,
    requestedPlayerId: row.requested_player_id,
    submittedName: row.submitted_name,
    submittedPdgaNumber: row.submitted_pdga_number,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
  };
}

function fromPlayerClaim(claim: PlayerClaim): PlayerClaimRow {
  return {
    id: claim.id,
    profile_id: claim.profileId,
    requested_player_id: claim.requestedPlayerId,
    submitted_name: claim.submittedName,
    submitted_pdga_number: claim.submittedPdgaNumber,
    status: claim.status,
    created_at: claim.createdAt,
    reviewed_at: claim.reviewedAt,
    reviewed_by: claim.reviewedBy,
  };
}

function toPlayer(row: PlayerRow): LaunchPlayer {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    pdgaNumber: row.pdga_number,
    pdgaRating: row.pdga_rating,
    currentTeamId: row.current_team_id,
    homeArea: row.home_area,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTeam(row: TeamRow): LaunchTeam {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    logo: row.logo,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEvent(row: EventRow): LaunchEvent {
  return {
    id: row.id,
    seasonLabel: row.season_label,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    courseName: row.course_name,
    directionsUrl: row.directions_url,
    date: row.date,
    time: row.time,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEventRoster(row: EventRosterRow): EventRoster {
  return {
    id: row.id,
    eventId: row.event_id,
    teamId: row.team_id,
    submittedByProfileId: row.submitted_by_profile_id,
    status: row.status,
    submittedAt: row.submitted_at,
    lockedAt: row.locked_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromEventRoster(roster: EventRoster): EventRosterRow {
  return {
    id: roster.id,
    event_id: roster.eventId,
    team_id: roster.teamId,
    submitted_by_profile_id: roster.submittedByProfileId,
    status: roster.status,
    submitted_at: roster.submittedAt,
    locked_at: roster.lockedAt,
    created_at: roster.createdAt,
    updated_at: roster.updatedAt,
  };
}

function toEventRosterPlayer(row: EventRosterPlayerRow): EventRosterPlayer {
  return {
    id: row.id,
    eventRosterId: row.event_roster_id,
    playerId: row.player_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromEventRosterPlayer(player: EventRosterPlayer): EventRosterPlayerRow {
  return {
    id: player.id,
    event_roster_id: player.eventRosterId,
    player_id: player.playerId,
    created_at: player.createdAt,
    updated_at: player.updatedAt,
  };
}

function toEventPost(row: EventPostRow): EventPost {
  return {
    id: row.id,
    eventId: row.event_id,
    type: row.type,
    authorName: row.author_name,
    body: row.body,
    imageUrl: row.image_url,
    status: row.status,
    createdAt: row.created_at,
    removedAt: row.removed_at,
    removedBy: row.removed_by,
  };
}

function fromEventPost(post: EventPost): EventPostRow {
  return {
    id: post.id,
    event_id: post.eventId,
    type: post.type,
    author_name: post.authorName,
    body: post.body,
    image_url: post.imageUrl,
    status: post.status,
    created_at: post.createdAt,
    removed_at: post.removedAt,
    removed_by: post.removedBy,
  };
}
