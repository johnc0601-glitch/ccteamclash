import type {LaunchRepository} from '@/domain/launch/LaunchRepository';
import type {
  AddEventPostInput,
  CreatePendingProfileInput,
  EventPost,
  EventRoster,
  EventRosterPlayer,
  LaunchProfile,
  LaunchPlayer,
  LaunchServiceResult,
  PlayerClaim,
  SaveLaunchPlayerInput,
  SubmitEventRosterInput,
  SubmitPlayerClaimInput,
} from '@/domain/launch/LaunchData';
import {createSlug} from '@/shared/utils/slug';

export class LaunchService {
  private readonly repository: LaunchRepository;

  constructor(repository: LaunchRepository) {
    this.repository = repository;
  }

  async createPendingProfile(input: CreatePendingProfileInput): Promise<LaunchServiceResult<LaunchProfile>> {
    const displayName = input.displayName.trim();
    if (!input.userId.trim()) return failure('User id is required.');
    if (!displayName) return failure('Display name is required.');

    const existingProfile = await this.repository.getProfileByUserId(input.userId);
    if (existingProfile) return {ok: true, data: existingProfile};

    const timestamp = now();
    return {
      ok: true,
      data: await this.repository.saveProfile({
        id: createId('profile', input.userId),
        userId: input.userId,
        displayName,
        role: 'Player',
        status: 'Pending',
        playerId: null,
        captainTeamId: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    };
  }

  async updateOwnProfileName(
    userId: string,
    displayNameInput: string,
  ): Promise<LaunchServiceResult<LaunchProfile>> {
    const displayName = displayNameInput.trim();
    if (!displayName) return failure('Display name is required.');

    const profile = await this.repository.getProfileByUserId(userId);
    if (!profile) return failure('Profile not found.');

    if (profile.playerId) {
      const player = await this.repository.getPlayer(profile.playerId);
      if (!player) return failure('Linked player record not found.');
      await this.repository.savePlayer({
        ...player,
        name: displayName,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      ok: true,
      data: await this.repository.saveProfile({
        ...profile,
        displayName,
        updatedAt: new Date().toISOString(),
      }),
    };
  }

  async submitPlayerClaim(input: SubmitPlayerClaimInput): Promise<LaunchServiceResult<PlayerClaim>> {
    const profile = await this.repository.getProfile(input.profileId);
    if (!profile) return failure('Profile not found.');
    if (input.requestedPlayerId && !await this.repository.getPlayer(input.requestedPlayerId)) {
      return failure('Player not found.');
    }

    const submittedName = input.submittedName.trim();
    if (!submittedName) return failure('Submitted name is required.');

    const timestamp = now();
    return {
      ok: true,
      data: await this.repository.savePlayerClaim({
        id: createId('claim', `${input.profileId}-${submittedName}`),
        profileId: input.profileId,
        requestedPlayerId: input.requestedPlayerId,
        submittedName,
        submittedPdgaNumber: input.submittedPdgaNumber.trim(),
        status: 'Pending',
        createdAt: timestamp,
        reviewedAt: null,
        reviewedBy: null,
      }),
    };
  }

  async approvePlayerClaim(
    claimId: string,
    commissionerProfileId: string,
    selectedPlayerId?: string | null,
  ): Promise<LaunchServiceResult<PlayerClaim>> {
    const commissioner = await this.requireCommissioner(commissionerProfileId);
    if (!commissioner.ok) return commissioner;

    const claim = await this.repository.getPlayerClaim(claimId);
    if (!claim) return failure('Player claim not found.');
    if (claim.status !== 'Pending') return failure('Only pending claims can be approved.');
    const requestedPlayerId = selectedPlayerId || claim.requestedPlayerId;
    if (!requestedPlayerId) return failure('Select an existing player before approval.');
    const player = await this.repository.getPlayer(requestedPlayerId);
    if (!player) return failure('Player not found.');

    const profile = await this.repository.getProfile(claim.profileId);
    if (!profile) return failure('Profile not found.');

    const timestamp = now();
    await this.updateClaimedPlayerName(player, claim.submittedName, timestamp);
    await this.repository.saveProfile({
      ...profile,
      displayName: claim.submittedName,
      status: 'Approved',
      playerId: requestedPlayerId,
      updatedAt: timestamp,
    });

    return {
      ok: true,
      data: await this.repository.savePlayerClaim({
        ...claim,
        requestedPlayerId,
        status: 'Approved',
        reviewedAt: timestamp,
        reviewedBy: commissioner.data.id,
      }),
    };
  }

  async confirmTeamPlayerClaim(
    claimId: string,
    captainProfileId: string,
  ): Promise<LaunchServiceResult<PlayerClaim>> {
    const claim = await this.repository.getPlayerClaim(claimId);
    if (!claim) return failure('Player claim not found.');
    if (claim.status !== 'Pending') return failure('Only pending claims can be confirmed.');
    if (!claim.requestedPlayerId) return failure('A selected player record is required.');

    const player = await this.repository.getPlayer(claim.requestedPlayerId);
    if (!player?.currentTeamId) return failure('The player must be assigned to a team before captain confirmation.');

    const captain = await this.requireTeamAccess(captainProfileId, player.currentTeamId);
    if (!captain.ok) return captain;

    const profile = await this.repository.getProfile(claim.profileId);
    if (!profile) return failure('Profile not found.');

    const timestamp = now();
    await this.updateClaimedPlayerName(player, claim.submittedName, timestamp);
    await this.repository.saveProfile({
      ...profile,
      displayName: claim.submittedName,
      status: 'Approved',
      playerId: player.id,
      updatedAt: timestamp,
    });

    return {
      ok: true,
      data: await this.repository.savePlayerClaim({
        ...claim,
        status: 'Approved',
        reviewedAt: timestamp,
        reviewedBy: captain.data.id,
      }),
    };
  }

  async savePlayer(
    input: SaveLaunchPlayerInput,
    commissionerProfileId: string,
  ): Promise<LaunchServiceResult<LaunchPlayer>> {
    const commissioner = await this.requireCommissioner(commissionerProfileId);
    if (!commissioner.ok) return commissioner;

    const name = input.name.trim();
    if (!name) return failure('Player name is required.');
    if (!['Male', 'Female', 'Unknown'].includes(input.gender)) return failure('Gender is invalid.');
    if (input.pdgaRating !== null && (input.pdgaRating < 0 || input.pdgaRating > 1200)) {
      return failure('PDGA rating must be between 0 and 1200.');
    }
    if (input.currentTeamId && !await this.repository.getTeam(input.currentTeamId)) {
      return failure('Team not found.');
    }

    const existingPlayer = input.playerId ? await this.repository.getPlayer(input.playerId) : undefined;
    if (input.playerId && !existingPlayer) return failure('Player not found.');

    const timestamp = now();
    return {
      ok: true,
      data: await this.repository.savePlayer({
        id: existingPlayer?.id ?? createId('player', name),
        name,
        gender: input.gender,
        pdgaNumber: input.pdgaNumber.trim(),
        pdgaRating: input.pdgaRating,
        currentTeamId: input.currentTeamId,
        homeArea: existingPlayer?.homeArea ?? '',
        active: input.active,
        createdAt: existingPlayer?.createdAt ?? timestamp,
        updatedAt: timestamp,
      }),
    };
  }

  async rejectPlayerClaim(claimId: string, commissionerProfileId: string): Promise<LaunchServiceResult<PlayerClaim>> {
    const commissioner = await this.requireCommissioner(commissionerProfileId);
    if (!commissioner.ok) return commissioner;

    const claim = await this.repository.getPlayerClaim(claimId);
    if (!claim) return failure('Player claim not found.');
    if (claim.status !== 'Pending') return failure('Only pending claims can be rejected.');

    return {
      ok: true,
      data: await this.repository.savePlayerClaim({
        ...claim,
        status: 'Rejected',
        reviewedAt: now(),
        reviewedBy: commissioner.data.id,
      }),
    };
  }

  async setProfileStatus(
    profileId: string,
    status: 'Approved' | 'Rejected' | 'Suspended',
    commissionerProfileId: string,
  ): Promise<LaunchServiceResult<LaunchProfile>> {
    const commissioner = await this.requireCommissioner(commissionerProfileId);
    if (!commissioner.ok) return commissioner;

    const profile = await this.repository.getProfile(profileId);
    if (!profile) return failure('Profile not found.');
    if (profile.id === commissionerProfileId && status !== 'Approved') {
      return failure('The active commissioner profile must stay approved.');
    }

    return {
      ok: true,
      data: await this.repository.saveProfile({
        ...profile,
        status,
        updatedAt: now(),
      }),
    };
  }

  async linkProfileToPlayer(
    profileId: string,
    playerId: string,
    commissionerProfileId: string,
    useProfileName = true,
  ): Promise<LaunchServiceResult<LaunchProfile>> {
    const commissioner = await this.requireCommissioner(commissionerProfileId);
    if (!commissioner.ok) return commissioner;

    const profile = await this.repository.getProfile(profileId);
    if (!profile) return failure('Profile not found.');
    if (profile.role === 'Commissioner') return failure('Commissioner accounts are not linked to player records here.');
    if (profile.status === 'Rejected' || profile.status === 'Suspended') {
      return failure('Only pending or approved accounts can be linked.');
    }

    const player = await this.repository.getPlayer(playerId);
    if (!player) return failure('Player not found.');

    const profiles = await this.repository.getProfiles();
    const existingLinkedProfile = profiles.find((candidate) => (
      candidate.id !== profile.id
      && candidate.playerId === playerId
      && candidate.status !== 'Rejected'
      && candidate.status !== 'Suspended'
    ));
    if (existingLinkedProfile) {
      return failure(`${player.name} is already linked to ${existingLinkedProfile.displayName}.`);
    }

    const timestamp = now();
    if (useProfileName) await this.updateClaimedPlayerName(player, profile.displayName, timestamp);

    return {
      ok: true,
      data: await this.repository.saveProfile({
        ...profile,
        status: 'Approved',
        playerId,
        updatedAt: timestamp,
      }),
    };
  }

  async assignCaptainTeam(
    profileId: string,
    teamId: string | null,
    commissionerProfileId: string,
  ): Promise<LaunchServiceResult<LaunchProfile>> {
    const commissioner = await this.requireCommissioner(commissionerProfileId);
    if (!commissioner.ok) return commissioner;

    const profile = await this.repository.getProfile(profileId);
    if (!profile) return failure('Profile not found.');
    if (teamId && !await this.repository.getTeam(teamId)) return failure('Team not found.');

    return {
      ok: true,
      data: await this.repository.saveProfile({
        ...profile,
        role: teamId ? 'Captain' : 'Player',
        captainTeamId: teamId,
        updatedAt: now(),
      }),
    };
  }

  async submitEventRoster(input: SubmitEventRosterInput): Promise<LaunchServiceResult<EventRoster>> {
    const captain = await this.requireTeamAccess(input.submittedByProfileId, input.teamId);
    if (!captain.ok) return captain;

    const event = await this.repository.getEvent(input.eventId);
    if (!event) return failure('Event not found.');
    if (event.status !== 'Scheduled') return failure('Rosters can only be submitted for scheduled events.');
    if (![event.homeTeamId, event.awayTeamId].includes(input.teamId)) return failure('Team is not in this event.');

    const playerIds = Array.from(new Set(input.playerIds));
    if (!playerIds.length) return failure('Select at least one player.');

    const players = await Promise.all(playerIds.map((playerId) => this.repository.getPlayer(playerId)));
    if (players.some((player) => !player || !player.active)) return failure('Every roster player must be active.');

    const timestamp = now();
    const existingRoster = await this.repository.getEventRosterByEventAndTeam(input.eventId, input.teamId);
    if (existingRoster?.status === 'Locked') return failure('Locked rosters cannot be changed.');

    const roster: EventRoster = {
      id: existingRoster?.id ?? createId('roster', `${input.eventId}-${input.teamId}`),
      eventId: input.eventId,
      teamId: input.teamId,
      submittedByProfileId: captain.data.id,
      status: 'Submitted',
      submittedAt: timestamp,
      lockedAt: existingRoster?.lockedAt ?? null,
      createdAt: existingRoster?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };

    await this.repository.saveEventRoster(roster);
    await this.repository.replaceEventRosterPlayers(
      roster.id,
      playerIds.map((playerId): EventRosterPlayer => ({
        id: createId('roster-player', `${roster.id}-${playerId}`),
        eventRosterId: roster.id,
        playerId,
        createdAt: timestamp,
        updatedAt: timestamp,
      })),
    );

    return {ok: true, data: roster};
  }

  async setRosterLocked(
    rosterId: string,
    locked: boolean,
    commissionerProfileId: string,
  ): Promise<LaunchServiceResult<EventRoster>> {
    const commissioner = await this.requireCommissioner(commissionerProfileId);
    if (!commissioner.ok) return commissioner;

    const roster = await this.repository.getEventRoster(rosterId);
    if (!roster) return failure('Roster not found.');

    return {
      ok: true,
      data: await this.repository.saveEventRoster({
        ...roster,
        status: locked ? 'Locked' : 'Open',
        lockedAt: locked ? now() : null,
        updatedAt: now(),
      }),
    };
  }

  async addEventPost(input: AddEventPostInput): Promise<LaunchServiceResult<EventPost>> {
    if (!await this.repository.getEvent(input.eventId)) return failure('Event not found.');
    if (!input.authorName.trim()) return failure('Author name is required.');
    if (input.type === 'Comment' && !input.body.trim()) return failure('Comment body is required.');
    if (input.type === 'Photo' && !input.imageUrl?.trim()) return failure('Photo URL is required.');

    const timestamp = now();
    return {
      ok: true,
      data: await this.repository.saveEventPost({
        id: createId('post', `${input.eventId}-${timestamp}`),
        eventId: input.eventId,
        type: input.type,
        authorName: input.authorName.trim(),
        body: input.body.trim(),
        imageUrl: input.imageUrl?.trim() || null,
        status: 'Visible',
        createdAt: timestamp,
        removedAt: null,
        removedBy: null,
      }),
    };
  }

  async removeEventPost(postId: string, commissionerProfileId: string): Promise<LaunchServiceResult<EventPost>> {
    const commissioner = await this.requireCommissioner(commissionerProfileId);
    if (!commissioner.ok) return commissioner;

    const post = await this.repository.getEventPost(postId);
    if (!post) return failure('Event post not found.');

    return {
      ok: true,
      data: await this.repository.saveEventPost({
        ...post,
        status: 'Removed',
        removedAt: now(),
        removedBy: commissioner.data.id,
      }),
    };
  }

  private async requireCommissioner(profileId: string): Promise<LaunchServiceResult<LaunchProfile>> {
    const profile = await this.repository.getProfile(profileId);
    if (!profile || profile.role !== 'Commissioner' || profile.status !== 'Approved') {
      return failure('Commissioner approval is required.');
    }
    return {ok: true, data: profile};
  }

  private async requireTeamAccess(profileId: string, teamId: string): Promise<LaunchServiceResult<LaunchProfile>> {
    const profile = await this.repository.getProfile(profileId);
    if (!profile || profile.status !== 'Approved') return failure('Approved profile is required.');
    if (profile.role === 'Commissioner') return {ok: true, data: profile};
    if (profile.role !== 'Captain' || profile.captainTeamId !== teamId) return failure('Captain team access is required.');
    return {ok: true, data: profile};
  }

  private async updateClaimedPlayerName(player: LaunchPlayer, submittedName: string, timestamp: string): Promise<void> {
    const name = submittedName.trim();
    if (!name || name === player.name) return;
    await this.repository.savePlayer({
      ...player,
      name,
      updatedAt: timestamp,
    });
  }
}

function failure<T>(message: string): LaunchServiceResult<T> {
  return {ok: false, message};
}

function now(): string {
  return new Date().toISOString();
}

function createId(prefix: string, value: string): string {
  const slug = createSlug(value) || prefix;
  const uniquePart = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36);
  return `${prefix}-${slug}-${uniquePart}`;
}
