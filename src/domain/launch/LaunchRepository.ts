import type {
  EventPost,
  EventRoster,
  EventRosterPlayer,
  LaunchEvent,
  LaunchPlayer,
  LaunchProfile,
  LaunchSeedData,
  LaunchTeam,
  PlayerClaim,
} from '@/domain/launch/LaunchData';

export interface LaunchRepository {
  getProfiles(): Promise<LaunchProfile[]>;
  getProfile(id: string): Promise<LaunchProfile | undefined>;
  getProfileByUserId(userId: string): Promise<LaunchProfile | undefined>;
  saveProfile(profile: LaunchProfile): Promise<LaunchProfile>;
  getPlayerClaims(): Promise<PlayerClaim[]>;
  getPlayerClaim(id: string): Promise<PlayerClaim | undefined>;
  savePlayerClaim(claim: PlayerClaim): Promise<PlayerClaim>;
  getPlayers(): Promise<LaunchPlayer[]>;
  getPlayer(id: string): Promise<LaunchPlayer | undefined>;
  getTeams(): Promise<LaunchTeam[]>;
  getTeam(id: string): Promise<LaunchTeam | undefined>;
  getEvents(): Promise<LaunchEvent[]>;
  getEvent(id: string): Promise<LaunchEvent | undefined>;
  getEventRosters(eventId?: string): Promise<EventRoster[]>;
  getEventRoster(id: string): Promise<EventRoster | undefined>;
  getEventRosterByEventAndTeam(eventId: string, teamId: string): Promise<EventRoster | undefined>;
  saveEventRoster(roster: EventRoster): Promise<EventRoster>;
  getEventRosterPlayers(eventRosterId: string): Promise<EventRosterPlayer[]>;
  replaceEventRosterPlayers(eventRosterId: string, players: EventRosterPlayer[]): Promise<EventRosterPlayer[]>;
  getEventPosts(eventId: string): Promise<EventPost[]>;
  getEventPost(id: string): Promise<EventPost | undefined>;
  saveEventPost(post: EventPost): Promise<EventPost>;
}

export class MockLaunchRepository implements LaunchRepository {
  private profiles: LaunchProfile[];
  private playerClaims: PlayerClaim[];
  private players: LaunchPlayer[];
  private teams: LaunchTeam[];
  private events: LaunchEvent[];
  private eventRosters: EventRoster[];
  private eventRosterPlayers: EventRosterPlayer[];
  private eventPosts: EventPost[];

  constructor(seed: LaunchSeedData) {
    this.profiles = seed.profiles.map(clone);
    this.playerClaims = seed.playerClaims.map(clone);
    this.players = seed.players.map(clone);
    this.teams = seed.teams.map(clone);
    this.events = seed.events.map(clone);
    this.eventRosters = seed.eventRosters.map(clone);
    this.eventRosterPlayers = seed.eventRosterPlayers.map(clone);
    this.eventPosts = seed.eventPosts.map(clone);
  }

  async getProfiles(): Promise<LaunchProfile[]> {
    return this.profiles.map(clone);
  }

  async getProfile(id: string): Promise<LaunchProfile | undefined> {
    return cloneFound(this.profiles.find((profile) => profile.id === id));
  }

  async getProfileByUserId(userId: string): Promise<LaunchProfile | undefined> {
    return cloneFound(this.profiles.find((profile) => profile.userId === userId));
  }

  async saveProfile(profile: LaunchProfile): Promise<LaunchProfile> {
    this.profiles = upsert(this.profiles, profile);
    return clone(profile);
  }

  async getPlayerClaims(): Promise<PlayerClaim[]> {
    return this.playerClaims.map(clone);
  }

  async getPlayerClaim(id: string): Promise<PlayerClaim | undefined> {
    return cloneFound(this.playerClaims.find((claim) => claim.id === id));
  }

  async savePlayerClaim(claim: PlayerClaim): Promise<PlayerClaim> {
    this.playerClaims = upsert(this.playerClaims, claim);
    return clone(claim);
  }

  async getPlayers(): Promise<LaunchPlayer[]> {
    return this.players.map(clone);
  }

  async getPlayer(id: string): Promise<LaunchPlayer | undefined> {
    return cloneFound(this.players.find((player) => player.id === id));
  }

  async getTeams(): Promise<LaunchTeam[]> {
    return this.teams.map(clone);
  }

  async getTeam(id: string): Promise<LaunchTeam | undefined> {
    return cloneFound(this.teams.find((team) => team.id === id));
  }

  async getEvents(): Promise<LaunchEvent[]> {
    return this.events.map(clone);
  }

  async getEvent(id: string): Promise<LaunchEvent | undefined> {
    return cloneFound(this.events.find((event) => event.id === id));
  }

  async getEventRosters(eventId?: string): Promise<EventRoster[]> {
    return this.eventRosters
      .filter((roster) => !eventId || roster.eventId === eventId)
      .map(clone);
  }

  async getEventRoster(id: string): Promise<EventRoster | undefined> {
    return cloneFound(this.eventRosters.find((roster) => roster.id === id));
  }

  async getEventRosterByEventAndTeam(eventId: string, teamId: string): Promise<EventRoster | undefined> {
    return cloneFound(this.eventRosters.find((roster) => roster.eventId === eventId && roster.teamId === teamId));
  }

  async saveEventRoster(roster: EventRoster): Promise<EventRoster> {
    this.eventRosters = upsert(this.eventRosters, roster);
    return clone(roster);
  }

  async getEventRosterPlayers(eventRosterId: string): Promise<EventRosterPlayer[]> {
    return this.eventRosterPlayers
      .filter((player) => player.eventRosterId === eventRosterId)
      .map(clone);
  }

  async replaceEventRosterPlayers(eventRosterId: string, players: EventRosterPlayer[]): Promise<EventRosterPlayer[]> {
    this.eventRosterPlayers = [
      ...this.eventRosterPlayers.filter((player) => player.eventRosterId !== eventRosterId),
      ...players.map(clone),
    ];
    return players.map(clone);
  }

  async getEventPosts(eventId: string): Promise<EventPost[]> {
    return this.eventPosts
      .filter((post) => post.eventId === eventId)
      .map(clone);
  }

  async getEventPost(id: string): Promise<EventPost | undefined> {
    return cloneFound(this.eventPosts.find((post) => post.id === id));
  }

  async saveEventPost(post: EventPost): Promise<EventPost> {
    this.eventPosts = upsert(this.eventPosts, post);
    return clone(post);
  }
}

function upsert<T extends {id: string}>(items: T[], item: T): T[] {
  const index = items.findIndex((candidate) => candidate.id === item.id);
  if (index === -1) return [...items, clone(item)];
  return items.map((candidate, candidateIndex) => candidateIndex === index ? clone(item) : candidate);
}

function clone<T>(value: T): T {
  return {...value};
}

function cloneFound<T>(value: T | undefined): T | undefined {
  return value ? clone(value) : undefined;
}
