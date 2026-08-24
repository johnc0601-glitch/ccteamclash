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
import type {Database} from '@/lib/supabase/database.current';

type LaunchSupabaseClient = SupabaseClient<Database>;
type Tables = Database['public']['Tables'];
type ProfileRow = Tables['launch_profiles']['Row'];
type PlayerClaimRow = Tables['launch_player_claims']['Row'];
type PlayerRow = Tables['launch_players']['Row'];
type TeamRow = Tables['launch_teams']['Row'];
type EventRow = Tables['launch_events']['Row'];
type EventRosterRow = Tables['launch_event_rosters']['Row'];
type EventRosterPlayerRow = Tables['launch_event_roster_players']['Row'];
type EventPostRow = Tables['launch_event_posts']['Row'];

type PlayerRatingRow = PlayerRow & {
  clash_index?: number | null;
  clash_index_provisional?: boolean | null;
};

export class SupabaseLaunchRepository implements LaunchRepository {
  private readonly supabase: LaunchSupabaseClient;

  constructor(supabase: LaunchSupabaseClient) {
    this.supabase = supabase;
  }

  async getProfiles(): Promise<LaunchProfile[]> {
    const {data, error} = await this.supabase.from('launch_profiles').select('*').order('display_name');
    if (error) throw error;
    return data.map(toProfile);
  }

  async getProfile(id: string): Promise<LaunchProfile | undefined> {
    const {data, error} = await this.supabase.from('launch_profiles').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toProfile(data) : undefined;
  }

  async getProfileByUserId(userId: string): Promise<LaunchProfile | undefined> {
    const {data, error} = await this.supabase.from('launch_profiles').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw error;
    return data ? toProfile(data) : undefined;
  }

  async saveProfile(profile: LaunchProfile): Promise<LaunchProfile> {
    const existingProfile = await this.getProfile(profile.id);
    const query = existingProfile
      ? this.supabase.from('launch_profiles').update(fromProfile(profile)).eq('id', profile.id)
      : this.supabase.from('launch_profiles').insert(fromProfile(profile));
    const {data, error} = await query.select().single();
    if (error) throw error;
    return toProfile(data);
  }

  async getPlayerClaims(): Promise<PlayerClaim[]> {
    const {data, error} = await this.supabase.from('launch_player_claims').select('*').order('created_at');
    if (error) throw error;
    return data.map(toPlayerClaim);
  }

  async getPlayerClaim(id: string): Promise<PlayerClaim | undefined> {
    const {data, error} = await this.supabase.from('launch_player_claims').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toPlayerClaim(data) : undefined;
  }

  async savePlayerClaim(claim: PlayerClaim): Promise<PlayerClaim> {
    const existingClaim = await this.getPlayerClaim(claim.id);
    const query = existingClaim
      ? this.supabase.from('launch_player_claims').update(fromPlayerClaim(claim)).eq('id', claim.id)
      : this.supabase.from('launch_player_claims').insert(fromPlayerClaim(claim));
    const {data, error} = await query.select().single();
    if (error) throw error;
    return toPlayerClaim(data);
  }

  async getPlayers(): Promise<LaunchPlayer[]> {
    const {data, error} = await this.supabase.from('launch_players').select('*').order('name');
    if (error) throw error;
    return data.map(toPlayer);
  }

  async getPlayer(id: string): Promise<LaunchPlayer | undefined> {
    const {data, error} = await this.supabase.from('launch_players').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toPlayer(data) : undefined;
  }

  async savePlayer(player: LaunchPlayer): Promise<LaunchPlayer> {
    const existingPlayer = await this.getPlayer(player.id);
    const query = existingPlayer
      ? this.supabase.from('launch_players').update(fromPlayer(player)).eq('id', player.id)
      : this.supabase.from('launch_players').insert(fromPlayer(player));
    const {data, error} = await query.select().single();
    if (error) throw error;
    return toPlayer(data);
  }

  async getTeams(): Promise<LaunchTeam[]> {
    const {data, error} = await this.supabase.from('launch_teams').select('*').order('name');
    if (error) throw error;
    return data.map(toTeam);
  }

  async getTeam(id: string): Promise<LaunchTeam | undefined> {
    const {data, error} = await this.supabase.from('launch_teams').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toTeam(data) : undefined;
  }

  async getEvents(): Promise<LaunchEvent[]> {
    const {data, error} = await this.supabase.from('launch_events').select('*').order('date');
    if (error) throw error;
    return data.map(toEvent);
  }

  async getEvent(id: string): Promise<LaunchEvent | undefined> {
    const {data, error} = await this.supabase.from('launch_events').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toEvent(data) : undefined;
  }

  async getEventRosters(eventId?: string): Promise<EventRoster[]> {
    let query = this.supabase.from('launch_event_rosters').select('*');
    if (eventId) query = query.eq('event_id', eventId);

    const {data, error} = await query.order('created_at');
    if (error) throw error;
    return data.map(toEventRoster);
  }

  async getEventRoster(id: string): Promise<EventRoster | undefined> {
    const {data, error} = await this.supabase.from('launch_event_rosters').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toEventRoster(data) : undefined;
  }

  async getEventRosterByEventAndTeam(eventId: string, teamId: string): Promise<EventRoster | undefined> {
    const {data, error} = await this.supabase
      .from('launch_event_rosters')
      .select('*')
      .eq('event_id', eventId)
      .eq('team_id', teamId)
      .maybeSingle();
    if (error) throw error;
    return data ? toEventRoster(data) : undefined;
  }

  async saveEventRoster(roster: EventRoster): Promise<EventRoster> {
    const existingRoster = await this.getEventRoster(roster.id);
    const query = existingRoster
      ? this.supabase.from('launch_event_rosters').update(fromEventRoster(roster)).eq('id', roster.id)
      : this.supabase.from('launch_event_rosters').insert(fromEventRoster(roster));
    const {data, error} = await query.select().single();
    if (error) throw error;
    return toEventRoster(data);
  }

  async getEventRosterPlayers(eventRosterId?: string): Promise<EventRosterPlayer[]> {
    let query = this.supabase.from('launch_event_roster_players').select('*');
    if (eventRosterId) query = query.eq('event_roster_id', eventRosterId);
    const {data, error} = await query.order('created_at');
    if (error) throw error;
    return data.map(toEventRosterPlayer);
  }

  async replaceEventRosterPlayers(
    eventRosterId: string,
    players: EventRosterPlayer[],
  ): Promise<EventRosterPlayer[]> {
    const deleteResult = await this.supabase
      .from('launch_event_roster_players')
      .delete()
      .eq('event_roster_id', eventRosterId);
    if (deleteResult.error) throw deleteResult.error;
    if (!players.length) return [];

    const {data, error} = await this.supabase
      .from('launch_event_roster_players')
      .insert(players.map(fromEventRosterPlayer))
      .select();
    if (error) throw error;
    return data.map(toEventRosterPlayer);
  }

  async saveEventRosterPlayer(player: EventRosterPlayer): Promise<EventRosterPlayer> {
    const {data, error} = await this.supabase
      .from('launch_event_roster_players')
      .upsert(fromEventRosterPlayer(player), {onConflict: 'id'})
      .select()
      .single();
    if (error) throw error;
    return toEventRosterPlayer(data);
  }

  async deleteEventRosterPlayers(eventRosterId: string): Promise<void> {
    const {error} = await this.supabase.from('launch_event_roster_players').delete().eq('event_roster_id', eventRosterId);
    if (error) throw error;
  }

  async getEventPosts(eventId?: string): Promise<EventPost[]> {
    let query = this.supabase.from('launch_event_posts').select('*');
    if (eventId) query = query.eq('event_id', eventId);
    const {data, error} = await query.order('created_at');
    if (error) throw error;
    return data.map(toEventPost);
  }

  async getEventPost(id: string): Promise<EventPost | undefined> {
    const {data, error} = await this.supabase.from('launch_event_posts').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data ? toEventPost(data) : undefined;
  }

  async saveEventPost(post: EventPost): Promise<EventPost> {
    const {data, error} = await this.supabase
      .from('launch_event_posts')
      .upsert(fromEventPost(post), {onConflict: 'id'})
      .select()
      .single();
    if (error) throw error;
    return toEventPost(data);
  }
}

function toProfile(row: ProfileRow): LaunchProfile {
  return {
    id: row.id,
    userId: row.user_id,
    displayName: row.display_name,
    role: row.role as LaunchProfile['role'],
    status: row.status as LaunchProfile['status'],
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
    status: row.status as PlayerClaim['status'],
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
  const rating = row as PlayerRatingRow;
  return {
    id: row.id,
    name: row.name,
    gender: row.gender as LaunchPlayer['gender'],
    pdgaNumber: row.pdga_number,
    pdgaRating: row.pdga_rating,
    clashIndex: rating.clash_index ?? null,
    clashIndexProvisional: rating.clash_index_provisional ?? false,
    currentTeamId: row.current_team_id,
    homeArea: row.home_area,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function fromPlayer(player: LaunchPlayer): PlayerRow {
  return {
    id: player.id,
    name: player.name,
    gender: player.gender,
    pdga_number: player.pdgaNumber,
    pdga_rating: player.pdgaRating,
    current_team_id: player.currentTeamId,
    home_area: player.homeArea,
    active: player.active,
    created_at: player.createdAt,
    updated_at: player.updatedAt,
  };
}

function toTeam(row: TeamRow): LaunchTeam {
  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name,
    logo: row.logo,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
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
    status: row.status as LaunchEvent['status'],
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
    status: row.status as LaunchEvent['status'],
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
    type: row.type as EventPost['type'],
    authorName: row.author_name,
    body: row.body,
    imageUrl: row.image_url,
    status: row.status as EventPost['status'],
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